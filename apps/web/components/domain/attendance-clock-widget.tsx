'use client';

import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatTime } from '@/lib/format';
import type { AttendanceRecord } from '@/lib/api-types';
import { Button } from '@/components/ui/button';

/** Topbar quick-action — every authenticated user clocks their own attendance, regardless of role (see backend's ungated /attendance/clock-in|out). */
export function AttendanceClockWidget() {
  const today = useApiQuery<AttendanceRecord | null>(() => apiGet('/attendance/me/today'), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClock(action: 'clock-in' | 'clock-out') {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiPost(`/attendance/${action}`);
      today.refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (today.isLoading) return null;

  if (error) {
    return <span className="hidden text-xs text-danger-600 dark:text-danger-400 md:inline">{error}</span>;
  }

  const record = today.data;

  if (!record?.checkInAt) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => handleClock('clock-in')} isLoading={isSubmitting}>
        <LogIn className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Clock In
      </Button>
    );
  }

  if (!record.checkOutAt) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-ink-secondary md:inline">Since {formatTime(record.checkInAt)}</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => handleClock('clock-out')} isLoading={isSubmitting}>
          <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Clock Out
        </Button>
      </div>
    );
  }

  return (
    <span className="hidden text-xs text-ink-secondary md:inline">
      {formatTime(record.checkInAt)} – {formatTime(record.checkOutAt)}
    </span>
  );
}
