import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from '../../../common/validators/mobile';

export class CreateBranchDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @Matches(INDIAN_MOBILE_REGEX, { message: INVALID_MOBILE_MESSAGE })
  phone?: string;
}
