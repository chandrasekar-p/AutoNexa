'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth/auth-context';
import { hasResourceAccess } from '@/lib/hooks/use-permission';
import { useCurrentTenant } from '@/lib/hooks/use-current-tenant';
import { getWorkshopHoursStatus } from '@/lib/workshop-hours';
import { initialsFor } from '@/lib/format';
import { NAV_SECTIONS, type NavItem } from './nav-items';

const STORAGE_KEY = 'autonexa-sidebar-collapsed';

function readInitialCollapsed(): boolean {
  // Same guarded-init pattern as theme-context.tsx's readInitialTheme —
  // avoids touching localStorage during SSR while still avoiding a
  // flash of the wrong width on a client that had it collapsed.
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

function NavLink({ href, label, icon: Icon, showLabel, onNavigate }: NavItem & { showLabel: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={showLabel ? undefined : label}
      onClick={onNavigate}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded px-3 text-sm transition-colors',
        !showLabel && 'justify-center',
        isActive
          ? 'bg-graphite-800 font-medium text-white'
          : 'text-white/80 hover:bg-graphite-850 hover:text-white',
      )}
    >
      <Icon aria-hidden className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent-400' : 'text-graphite-300')} />
      {showLabel ? label : <span className="sr-only">{label}</span>}
    </Link>
  );
}

interface SidebarProps {
  /** Whether the mobile/tablet off-canvas drawer is open. Ignored at the `lg` breakpoint and up, where the sidebar is always in-flow. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const tenant = useCurrentTenant();
  const hours = tenant ? getWorkshopHoursStatus(tenant.settings.businessHoursOpen, tenant.settings.businessHoursClose) : null;

  // The desktop density preference is irrelevant to the mobile drawer — a
  // collapsed icon-only rail would be nearly useless inside a full-screen
  // overlay a visitor just opened to find their way around, so the drawer
  // always shows full labels regardless of the persisted `collapsed` state.
  const showLabels = !collapsed || mobileOpen;

  // One useAuth() call, then plain filtering — not a hook per nav item —
  // so a section's header can be skipped entirely when every item inside
  // it is gated out for this role, without violating rules-of-hooks.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.resource === null || hasResourceAccess(user, item.resource)),
  })).filter((section) => section.items.length > 0);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  // Same logout() + redirect pattern as UserMenu's topbar dropdown — this
  // is a second, always-visible entry point to the same action (standard
  // sidebar convention: logout pinned at the bottom, not just behind the
  // avatar menu), not a separate implementation of it.
  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  }

  return (
    <>
      {mobileOpen ? <div className="fixed inset-0 z-30 bg-graphite-950/60 lg:hidden" onClick={onMobileClose} aria-hidden /> : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-graphite-800 bg-graphite-900',
          'transition-transform duration-200 lg:static lg:transition-[width]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          showLabels ? 'w-60' : 'w-16',
        )}
      >
        <div className={cn('flex h-14 items-center gap-2.5 border-b border-graphite-800', showLabels ? 'px-3' : 'justify-center px-0')}>
          {showLabels ? (
            <>
              <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0 rounded-md" priority />
              <span className="flex-1 truncate text-sm font-semibold tracking-wide text-white">AutoNexa</span>
            </>
          ) : null}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded text-white/60 transition-colors hover:bg-graphite-850 hover:text-white lg:flex"
          >
            {collapsed ? <PanelLeftOpen aria-hidden className="h-4 w-4" /> : <PanelLeftClose aria-hidden className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            title="Close menu"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/60 transition-colors hover:bg-graphite-850 hover:text-white lg:hidden"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          {sections.map((section, index) => (
            <div key={section.label ?? `section-${index}`} className="flex flex-col gap-0.5">
              {section.label && showLabels ? (
                <span className="px-3 pb-1 pt-2 text-micro font-semibold uppercase tracking-wide text-white/35">
                  {section.label}
                </span>
              ) : null}
              {section.label && !showLabels && index > 0 ? <div className="mx-1 my-1.5 border-t border-graphite-800" aria-hidden /> : null}
              {section.items.map((item) => (
                <NavLink key={item.href} {...item} showLabel={showLabels} onNavigate={onMobileClose} />
              ))}
            </div>
          ))}
        </nav>
        {hours ? (
          <div className={cn('border-t border-graphite-800 px-3 py-3', !showLabels && 'flex justify-center px-0')} title={!showLabels ? `${hours.isOpen ? 'Open' : 'Closed'} · ${hours.hoursLabel}` : undefined}>
            {showLabels ? (
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                  <span className={cn('h-1.5 w-1.5 rounded-full', hours.isOpen ? 'bg-success-400' : 'bg-white/30')} aria-hidden />
                  {hours.isOpen ? 'Open' : 'Closed'}
                </span>
                <span className="text-micro text-white/45">{hours.hoursLabel}</span>
              </div>
            ) : (
              <span className={cn('h-2 w-2 rounded-full', hours.isOpen ? 'bg-success-400' : 'bg-white/30')} aria-hidden />
            )}
          </div>
        ) : null}
        <div className={cn('flex items-center gap-2.5 border-t border-graphite-800 px-3 py-3', !showLabels && 'flex-col px-0')}>
          {showLabels ? (
            <>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-micro font-semibold text-white">
                {initialsFor(user?.name ?? user?.email ?? '?')}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-white/70">{user?.name ?? user?.email}</span>
            </>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Log out"
            title="Log out"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded text-white/60 transition-colors hover:bg-danger-500/15 hover:text-danger-400 disabled:opacity-60',
              !showLabels && 'w-full',
            )}
          >
            <LogOut aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
