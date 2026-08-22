import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  // Admin-settable too, not just self-service via PATCH /users/me — see
  // UpdateOwnProfileDto's identical field. The stored reference from POST
  // /uploads (category: 'user-avatar'), not a display URL.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
