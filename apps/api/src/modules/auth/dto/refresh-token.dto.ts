import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  // Optional because the refresh token is normally read from the httpOnly
  // cookie; the body field exists for non-browser clients (mobile app).
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
