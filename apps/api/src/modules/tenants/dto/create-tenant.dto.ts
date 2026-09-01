import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';

export const PLAN_TIERS = ['trial', 'starter', 'pro'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

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

  @ApiPropertyOptional({ enum: PLAN_TIERS, example: 'trial', description: 'Defaults to "standard" (permanent, no trial) when omitted' })
  @IsOptional()
  @IsIn(PLAN_TIERS)
  planTier?: PlanTier;

  @ApiPropertyOptional({ example: 14, description: 'Only meaningful when planTier is "trial" — days from creation until trialEndsAt. Defaults to 14.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  trialDays?: number;
}
