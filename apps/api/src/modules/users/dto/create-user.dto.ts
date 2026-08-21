import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from '../../../common/validators/mobile';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(INDIAN_MOBILE_REGEX, { message: INVALID_MOBILE_MESSAGE })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ type: [String], description: 'Role IDs to assign, e.g. ["<Service Advisor role id>"]' })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
