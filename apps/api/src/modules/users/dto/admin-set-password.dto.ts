import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

// Deliberately no currentPassword field, unlike ChangePasswordDto — this is
// an admin action (user:update), not self-service, so there's nothing for
// the admin to prove about the target user's existing password. Gated
// entirely by the user:update permission at the route.
export class AdminSetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
