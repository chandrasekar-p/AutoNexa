'use client';

import { Menu } from 'lucide-react';
import { useCurrentTenant } from '@/lib/hooks/use-current-tenant';
import { getWorkshopHoursStatus } from '@/lib/workshop-hours';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { GlobalSearch } from '@/components/domain/global-search';
import { AttendanceClockWidget } from '@/components/domain/attendance-clock-widget';
import { NotificationBell } from '@/components/domain/notification-bell';
import { TrialStatusChip } from '@/components/domain/trial-status-chip';
import { UserMenu } from './user-menu';

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const tenant = useCurrentTenant();
  const hours = tenant ? getWorkshopHoursStatus(tenant.settings.businessHoursOpen, tenant.settings.businessHoursClose) : null;

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-ink-secondary hover:bg-surface-hover hover:text-ink lg:hidden"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>
        {tenant ? (
          <span className="hidden shrink-0 flex-col md:flex">
            <span className="text-sm font-medium leading-tight text-ink">{tenant.name}</span>
            {hours ? (
              <span className="flex items-center gap-1 text-micro leading-tight text-ink-secondary">
                <span
                  className={hours.isOpen ? 'h-1.5 w-1.5 rounded-full bg-success-500' : 'h-1.5 w-1.5 rounded-full bg-ink-muted'}
                  aria-hidden
                />
                {hours.isOpen ? 'Workshop Open' : 'Workshop Closed'}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="hidden shrink-0 text-sm font-medium text-ink md:block">&nbsp;</span>
        )}
        <TrialStatusChip />
        <GlobalSearch />
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <AttendanceClockWidget />
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
