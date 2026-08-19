import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

// Same metadata-only pattern as AddVehicleDocumentDto — the upload flow
// itself (presigned URL to object storage) belongs to the Phase 1 "File
// Storage" module; this endpoint just records the resulting reference.
export class AddInspectionPhotoDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileName?: string;
}
