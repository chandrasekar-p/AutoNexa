import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from '../../../common/validators/mobile';
import { GSTIN_REGEX, INVALID_GSTIN_MESSAGE } from '../../../common/validators/gstin';

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(INDIAN_MOBILE_REGEX, { message: INVALID_MOBILE_MESSAGE })
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '33AAAAA0000A1Z5' })
  @IsOptional()
  @IsString()
  @Matches(GSTIN_REGEX, { message: INVALID_GSTIN_MESSAGE })
  gstin?: string;

  @ApiPropertyOptional({ example: 'Net 30' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
