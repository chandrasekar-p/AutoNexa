import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// currentStock is deliberately not settable here — it always starts at 0
// and only ever moves through InventoryTransaction-backed operations
// (goods receipt, job card consumption/return), so it stays reconcilable
// against the ledger. No opening-balance/adjustment endpoint exists yet.
export class CreatePartDto {
  @ApiProperty({ example: 'PN-10234' })
  @IsString()
  @IsNotEmpty()
  partNumber: string;

  @ApiProperty({ example: 'SKU-BRK-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Front brake pad set' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Freeform for now', example: 'BMW X5 2018-2023' })
  @IsOptional()
  @IsString()
  vehicleCompatibility?: string;

  @ApiPropertyOptional({ description: 'Primary/preferred supplier' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ default: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  binLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  warrantyPeriodMonths?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
