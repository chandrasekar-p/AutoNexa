import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Premium Auto Coimbatore' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'premium-auto-cbe', description: 'URL-safe unique slug' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstin?: string;

  // Bootstraps the workshop's first admin user.
  @ApiProperty({ example: 'Owner Name' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'owner@premiumauto.example' })
  @IsEmail()
  ownerEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerPassword: string;
}
