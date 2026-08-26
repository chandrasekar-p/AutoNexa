'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** ms before auto-dismiss; defaults to 3000. */
  duration?: number;
}

/**
 * Minimal, local-state, no portal/context — this app has no global toast
 * system today (every other create/edit flow just navigates away or shows
 * an inline error banner), so this is deliberately small rather than a
 * new app-wide subsystem. Each page that wants one owns its own
 * `message: string | null` state and renders this when set.
 */
export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  return (
    <div
      role="status"
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-lg border border-success-200 bg-surface px-4 py-3 shadow-panel',
        'dark:border-success-500/30',
      )}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600 dark:text-success-400" aria-hidden />
      <span className="text-sm text-ink">{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-ink-muted hover:text-ink">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
