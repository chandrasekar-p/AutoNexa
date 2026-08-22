import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { WarrantyClaimStatus } from '@prisma/client';

export class UpdateWarrantyClaimDto {
  @ApiPropertyOptional({ enum: WarrantyClaimStatus })
  @IsOptional()
  @IsEnum(WarrantyClaimStatus)
  status?: WarrantyClaimStatus;

  @ApiPropertyOptional({ description: 'Whether the covered fix is charged to the customer or free — locked in at approval' })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
