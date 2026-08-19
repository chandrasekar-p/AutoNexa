import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class AddVehicleDocumentDto {
  @ApiProperty({ enum: ['insurance', 'rc', 'puc', 'warranty', 'other'] })
  @IsIn(['insurance', 'rc', 'puc', 'warranty', 'other'])
  docType: string;

  // Upload flow itself (presigned URL to object storage) belongs to the
  // Phase 1 "File Storage" module; this endpoint just records the
  // resulting reference once the client has uploaded the file.
  @ApiProperty()
  @IsUrl({ require_tld: false })
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fileName?: string;
}
