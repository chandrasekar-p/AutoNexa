'use client';

import { useTrialStatus } from '@/lib/hooks/use-trial-status';
import { daysUntil } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Always visible for a trial plan, regardless of how many days are left —
 * unlike TrialStatusBanner, which only appears in the final 3 days/after
 * expiry. This is the one place a vendor can check their trial status at
 * any point, not just when it's about to run out.
 */
export function TrialStatusChip() {
  const status = useTrialStatus();

  if (!status || status.planTier !== 'trial' || !status.trialEndsAt) return null;

  const days = daysUntil(status.trialEndsAt);
  const urgent = days <= 3;

  return (
    <span
      className={cn(
        'hidden shrink-0 items-center gap-1 text-micro leading-tight md:flex',
        urgent ? 'text-danger-600 dark:text-danger-400' : 'text-ink-secondary',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', urgent ? 'bg-danger-500' : 'bg-warning-500')} aria-hidden />
      {days < 0 ? `Trial expired ${Math.abs(days)}d ago` : `Trial · ${days}d left`}
    </span>
  );
}
