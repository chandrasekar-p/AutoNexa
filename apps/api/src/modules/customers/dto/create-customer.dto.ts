import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from '../../../common/validators/mobile';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+91 98765 43210' })
  @IsString()
  @IsNotEmpty()
  @Matches(INDIAN_MOBILE_REGEX, { message: INVALID_MOBILE_MESSAGE })
  mobile: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(INDIAN_MOBILE_REGEX, { message: INVALID_MOBILE_MESSAGE })
  altMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ enum: ['individual', 'business'], default: 'individual' })
  @IsOptional()
  @IsIn(['individual', 'business'])
  customerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
