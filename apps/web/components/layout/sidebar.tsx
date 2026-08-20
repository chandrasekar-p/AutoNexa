'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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

function NavLink({ href, label, icon: Icon, collapsed }: NavItem & { collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex h-9 items-center gap-2.5 rounded px-3 text-sm transition-colors',
        collapsed && 'justify-center',
        isActive
          ? 'bg-graphite-800 font-medium text-white'
          : 'text-white/80 hover:bg-graphite-850 hover:text-white',
      )}
    >
      <Icon aria-hidden className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent-400' : 'text-graphite-300')} />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </Link>
  );
}

function NavItemGated({ collapsed, ...item }: NavItem & { collapsed: boolean }) {
  // Hooks can't be called conditionally, but a resource of `null` always
  // passes — this small wrapper keeps that decision colocated per item
  // rather than filtering the whole list with a hook called in a loop.
  const hasAccess = useHasResourceAccess(item.resource ?? '__always__');
  if (item.resource !== null && !hasAccess) return null;
  return <NavLink {...item} collapsed={collapsed} />;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-graphite-800 bg-graphite-900 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2.5 border-b border-graphite-800', collapsed ? 'justify-center px-0' : 'px-3')}>
        {collapsed ? null : (
          <>
            <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0 rounded-md" priority />
            <span className="flex-1 truncate text-sm font-semibold tracking-wide text-white">AutoNexa</span>
          </>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/60 transition-colors hover:bg-graphite-850 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen aria-hidden className="h-4 w-4" /> : <PanelLeftClose aria-hidden className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavItemGated key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}
