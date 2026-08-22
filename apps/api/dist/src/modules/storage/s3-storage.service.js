"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageService = void 0;
const crypto_1 = require("crypto");
const path_1 = require("path");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const SIGNED_URL_EXPIRY_SECONDS = 15 * 60;
async function streamToBuffer(body) {
    const stream = body;
    const chunks = [];
    for await (const chunk of stream)
        chunks.push(chunk);
    return Buffer.concat(chunks);
}
class S3StorageService {
    constructor(options) {
        this.bucket = options.bucket;
        this.client = new client_s3_1.S3Client({
            region: options.region,
            credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
            ...(options.endpoint ? { endpoint: options.endpoint, forcePathStyle: true } : {}),
        });
    }
    async upload({ buffer, tenantId, category, entityId, filename }) {
        const storedName = `${(0, crypto_1.randomUUID)()}${(0, path_1.extname)(filename).toLowerCase()}`;
        const key = entityId
            ? `tenants/${tenantId}/${category}/${entityId}/${storedName}`
            : `tenants/${tenantId}/${category}/${storedName}`;
        await this.client.send(new client_s3_1.PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer }));
        return { key };
    }
    async getSignedUrl(key) {
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: SIGNED_URL_EXPIRY_SECONDS });
    }
    async getBuffer(key) {
        const result = await this.client.send(new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }));
        return streamToBuffer(result.Body);
    }
    async delete(key) {
        try {
            await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
        }
        catch (err) {
            if (err.name !== 'NoSuchKey')
                throw err;
        }
    }
}
exports.S3StorageService = S3StorageService;
//# sourceMappingURL=s3-storage.service.js.map