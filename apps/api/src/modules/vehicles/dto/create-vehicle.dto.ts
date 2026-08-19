import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: 'TN 37 AB 1234' })
  @IsString()
  @IsNotEmpty()
  registrationNo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({ example: 'BMW' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'X5' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1980)
  manufactureYear?: number;

  @ApiPropertyOptional({ enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng'] })
  @IsOptional()
  @IsIn(['petrol', 'diesel', 'electric', 'hybrid', 'cng'])
  fuelType?: string;

  @ApiPropertyOptional({ enum: ['manual', 'automatic'] })
  @IsOptional()
  @IsIn(['manual', 'automatic'])
  transmission?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  odometerReading?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  pucExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warrantyInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
