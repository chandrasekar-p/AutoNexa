'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useHasResourceAccess } from '@/lib/hooks/use-permission';
import { NAV_ITEMS, type NavItem } from './nav-items';

const STORAGE_KEY = 'autonexa-sidebar-collapsed';

function readInitialCollapsed(): boolean {
  // Same guarded-init pattern as theme-context.tsx's readInitialTheme —
  // avoids touching localStorage during SSR while still avoiding a
  // flash of the wrong width on a client that had it collapsed.
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

function NavLink({
  href,
  label,
  icon: Icon,
  showLabel,
  onNavigate,
}: NavItem & { showLabel: boolean; onNavigate: () => void }) {
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

function NavItemGated({ showLabel, onNavigate, ...item }: NavItem & { showLabel: boolean; onNavigate: () => void }) {
  // Hooks can't be called conditionally, but a resource of `null` always
  // passes — this small wrapper keeps that decision colocated per item
  // rather than filtering the whole list with a hook called in a loop.
  const hasAccess = useHasResourceAccess(item.resource ?? '__always__');
  if (item.resource !== null && !hasAccess) return null;
  return <NavLink {...item} showLabel={showLabel} onNavigate={onNavigate} />;
}

interface SidebarProps {
  /** Whether the mobile/tablet off-canvas drawer is open. Ignored at the `lg` breakpoint and up, where the sidebar is always in-flow. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);

  // The desktop density preference is irrelevant to the mobile drawer — a
  // collapsed icon-only rail would be nearly useless inside a full-screen
  // overlay a visitor just opened to find their way around, so the drawer
  // always shows full labels regardless of the persisted `collapsed` state.
  const showLabels = !collapsed || mobileOpen;

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-graphite-950/60 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      ) : null}
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
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavItemGated key={item.href} {...item} showLabel={showLabels} onNavigate={onMobileClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}
