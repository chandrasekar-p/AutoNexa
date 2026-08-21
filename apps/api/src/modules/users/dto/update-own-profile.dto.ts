import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from '../../../common/validators/mobile';

// Deliberately narrow — a self-service PATCH /users/me must never let a
// user change their own email (the login identity, no verification flow
// exists for it), role, branch, or isActive. Those stay admin-only via
// PATCH /users/:id (user:update). Name/phone are the only fields safe for
// anyone to change about themselves.
export class UpdateOwnProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(INDIAN_MOBILE_REGEX, { message: INVALID_MOBILE_MESSAGE })
  phone?: string;
}
