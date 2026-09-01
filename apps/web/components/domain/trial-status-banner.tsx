'use client';

import { AlertTriangle } from 'lucide-react';
import { useTrialStatus } from '@/lib/hooks/use-trial-status';
import { daysUntil } from '@/lib/format';

/**
 * Soft warning only, per today's scope — never blocks access. Renders
 * nothing for a non-trial plan, or a trial with more than 3 days left
 * (see TrialStatusChip in the Topbar for the always-visible countdown —
 * this banner is only the urgent last-3-days/expired escalation).
 */
export function TrialStatusBanner() {
  const status = useTrialStatus();

  if (!status || status.planTier !== 'trial' || !status.trialEndsAt) return null;

  const days = daysUntil(status.trialEndsAt);
  if (days > 3) return null;

  const expired = days < 0;

  return (
    <div
      role="alert"
      className={
        expired
          ? 'flex items-center gap-2.5 border-b border-danger-100 bg-danger-50 px-4 py-2 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400'
          : 'flex items-center gap-2.5 border-b border-warning-100 bg-warning-50 px-4 py-2 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400'
      }
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      {expired ? (
        <span>Your trial has expired — contact us to continue using AutoNexa.</span>
      ) : (
        <span>
          Your trial ends in {days} day{days === 1 ? '' : 's'} — contact us to upgrade and keep access.
        </span>
      )}
    </div>
  );
}
