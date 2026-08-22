import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from './storage.types';
import { LocalDiskStorageService } from './local-disk-storage.service';
import { S3StorageService } from './s3-storage.service';

// @Global() — same pattern as PrismaModule, since StorageService is needed
// across unrelated feature modules (uploads, invoices, vehicles, tenants,
// inspections, dashboard) that have no other reason to depend on each other.
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService) => {
        if (config.get<string>('storage.mode') !== 's3') return new LocalDiskStorageService();

        const bucket = config.get<string>('storage.s3.bucket');
        const region = config.get<string>('storage.s3.region');
        const accessKeyId = config.get<string>('storage.s3.accessKeyId');
        const secretAccessKey = config.get<string>('storage.s3.secretAccessKey');
        // Fail fast at boot, not a quiet fallback to local disk — storage
        // silently degrading in production is exactly the failure mode
        // this migration exists to eliminate.
        if (!bucket || !region || !accessKeyId || !secretAccessKey) {
          throw new Error('STORAGE_MODE=s3 requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY to be set');
        }

        return new S3StorageService({ bucket, region, accessKeyId, secretAccessKey, endpoint: config.get<string>('storage.s3.endpoint') });
      },
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
