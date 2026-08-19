import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLabourItemDto {
  @ApiProperty({ example: 'LBR-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Front brake pad replacement' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0.01)
  standardHours: number;

  @ApiProperty({ description: 'Per hour' })
  @IsNumber()
  @Min(0)
  labourRate: number;

  @ApiPropertyOptional({ default: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @ApiPropertyOptional({ example: 'AC Specialist' })
  @IsOptional()
  @IsString()
  technicianCategory?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
