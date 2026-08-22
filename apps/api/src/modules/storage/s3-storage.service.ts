import { randomUUID } from 'crypto';
import { extname } from 'path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import { StorageService, UploadParams } from './storage.types';

const SIGNED_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes — see the architecture doc's reasoning: long enough for a normal page view, short enough to limit exposure if a URL leaks (browser history, logs, a screenshot)

export interface S3StorageOptions {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  // Set for R2/MinIO/any non-AWS S3-compatible provider; unset uses AWS's default endpoint resolution.
  endpoint?: string;
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  const stream = body as AsyncIterable<Uint8Array>;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * STORAGE_MODE=s3 — any S3-compatible provider (AWS S3, Cloudflare R2,
 * MinIO, ...) via `endpoint` + forcePathStyle. Buckets are never
 * public-read/public-write (per the Phase 1 security doc) — every read
 * goes through a freshly-signed, time-limited URL, generated here, never
 * cached or persisted.
 *
 * Takes a plain options object, not a NestJS ConfigService — so it can be
 * constructed directly by storage.module.ts's factory, by the one-off
 * scripts/migrate-uploads-to-s3.ts script, and by tests, all without a
 * fake ConfigService duck-type.
 */
export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
      ...(options.endpoint ? { endpoint: options.endpoint, forcePathStyle: true } : {}),
    });
  }

  async upload({ buffer, tenantId, category, entityId, filename }: UploadParams): Promise<{ key: string }> {
    const storedName = `${randomUUID()}${extname(filename).toLowerCase()}`;
    const key = entityId
      ? `tenants/${tenantId}/${category}/${entityId}/${storedName}`
      : `tenants/${tenantId}/${category}/${storedName}`;

    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer }));
    return { key };
  }

  async getSignedUrl(key: string): Promise<string> {
    return presign(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: SIGNED_URL_EXPIRY_SECONDS });
  }

  async getBuffer(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return streamToBuffer(result.Body);
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      // Same "already gone is not an error" posture as LocalDiskStorageService.
      if ((err as { name?: string }).name !== 'NoSuchKey') throw err;
    }
  }
}
