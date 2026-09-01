import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { PLAN_TIERS, PlanTier } from './create-tenant.dto';

const PLAN_TIERS_WITH_LEGACY = [...PLAN_TIERS, 'standard'] as const;

export class UpdateTenantPlanDto {
  @ApiPropertyOptional({ enum: PLAN_TIERS_WITH_LEGACY })
  @IsOptional()
  @IsIn(PLAN_TIERS_WITH_LEGACY)
  planTier?: PlanTier | 'standard';

  // Explicit `null` clears the trial (e.g. converting to a paid plan);
  // omitted leaves the existing value untouched; a date string sets/
  // extends it. class-validator's @IsOptional() already treats null the
  // same as undefined (skips further validation), so this needs no extra
  // handling to accept null through validation — the service tells the
  // three cases apart via `'trialEndsAt' in dto` / the value itself.
  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsISO8601()
  trialEndsAt?: string | null;
}
