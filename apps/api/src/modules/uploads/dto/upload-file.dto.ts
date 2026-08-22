import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { UploadCategory } from '../../storage/storage.types';

const CATEGORIES: UploadCategory[] = ['vehicle-photo', 'inspection-photo', 'vehicle-document', 'workshop-logo'];

// Arrives as a regular multipart text field alongside `file` — the
// frontend already knows exactly what it's uploading at every one of its
// 3 call sites (workshop logo, vehicle photo, inspection photo), so
// supplying this is a one-line addition there, not new logic. Needed so
// StorageService can build a sane S3 key namespace
// (tenants/{tenantId}/{category}/...) — LOCAL_DISK mode ignores it (its
// key shape never changed), so this has zero effect for local dev.
export class UploadFileDto {
  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  category: UploadCategory;

  // The owning entity's id (inspection id, vehicle id) — omitted for
  // workshop-logo, which is tenant-level, not tied to one entity.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;
}
