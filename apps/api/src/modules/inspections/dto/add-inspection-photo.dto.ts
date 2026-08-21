import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Same metadata-only pattern as AddVehicleDocumentDto — this endpoint just
// records the reference returned by POST /uploads, not a step of the
// upload itself. That endpoint returns a relative path
// (/uploads/<tenantId>/<uuid>.ext — see upload-storage.ts and
// resolveUploadUrl on the frontend), never an absolute URL, so this must
// be a plain string, not @IsUrl() — that rejected every real upload with
// "fileUrl must be a URL address" until fixed.
export class AddInspectionPhotoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileName?: string;
}
