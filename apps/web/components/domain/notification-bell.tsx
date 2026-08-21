'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { formatDate, formatTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Notification, PaginatedResult } from '@/lib/api-types';

// Only entity types this codebase actually creates a Notification for
// today (see JobCardsService/EstimatesService's own notification.create
// calls) — a type this doesn't recognize just doesn't navigate anywhere
// on click, it still marks read.
const ENTITY_ROUTE: Record<string, (id: string) => string> = {
  JobCard: (id) => `/job-cards/${id}`,
  Estimate: (id) => `/estimates/${id}`,
};

/** In-app staff bell — GET/PATCH /notifications, the same endpoints DashboardAlertsCard's underlying data model already relies on elsewhere, just a live unread-count + dropdown here instead of a dashboard card. */
export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unread = useApiQuery<PaginatedResult<Notification>>(() => apiGet('/notifications?isRead=false&pageSize=1'), []);
  const recent = useApiQuery<PaginatedResult<Notification>>(
    () => (isOpen ? apiGet('/notifications?pageSize=8') : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 8, totalPages: 0 })),
    [isOpen],
  );

  const unreadCount = unread.data?.total ?? 0;

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function handleSelect(notification: Notification) {
    setIsOpen(false);
    if (!notification.isRead) {
      apiPatch(`/notifications/${notification.id}/read`).then(() => {
        unread.refetch();
      });
    }
    const toRoute = notification.relatedEntityType ? ENTITY_ROUTE[notification.relatedEntityType] : undefined;
    if (toRoute && notification.relatedEntityId) router.push(toRoute(notification.relatedEntityId));
  }

  async function handleMarkAllRead() {
    await apiPatch('/notifications/read-all');
    unread.refetch();
    recent.refetch();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink',
          isOpen && 'bg-surface-hover text-ink',
        )}
      >
        <Bell aria-hidden className="h-4.5 w-4.5" />
        {unreadCount > 0 ? (
          <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-line bg-surface shadow-card"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unreadCount > 0 ? (
              <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recent.isLoading ? <p className="px-3 py-4 text-center text-xs text-ink-muted">Loading…</p> : null}
            {recent.data && recent.data.items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">No notifications yet.</p>
            ) : null}
            {recent.data?.items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-surface-hover',
                  !n.isRead && 'bg-accent-50 dark:bg-accent-500/10',
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {!n.isRead ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden /> : null}
                  {n.title}
                </span>
                <span className="truncate text-xs text-ink-secondary">{n.message}</span>
                <span className="text-micro text-ink-muted">
                  {formatDate(n.createdAt)} &middot; {formatTime(n.createdAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
