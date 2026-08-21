import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddVehicleDocumentDto {
  @ApiProperty({ enum: ['insurance', 'rc', 'puc', 'warranty', 'other'] })
  @IsIn(['insurance', 'rc', 'puc', 'warranty', 'other'])
  docType: string;

  // This endpoint just records the reference returned by POST /uploads,
  // not a step of the upload itself. That endpoint returns a relative path
  // (/uploads/<tenantId>/<uuid>.ext — see upload-storage.ts and
  // resolveUploadUrl on the frontend), never an absolute URL, so this must
  // be a plain string, not @IsUrl() — same bug fixed in
  // AddInspectionPhotoDto, this one just has no frontend caller yet to
  // have surfaced it.
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
