import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  phone?: string;
}
