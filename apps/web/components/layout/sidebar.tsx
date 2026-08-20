'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useHasResourceAccess } from '@/lib/hooks/use-permission';
import { NAV_ITEMS } from './nav-items';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'flex h-9 items-center rounded px-3 text-sm transition-colors',
        isActive
          ? 'bg-graphite-800 font-medium text-white'
          : 'text-graphite-400 hover:bg-graphite-850 hover:text-graphite-100',
      )}
    >
      <span
        aria-hidden
        className={cn('mr-2.5 h-1.5 w-1.5 rounded-full', isActive ? 'bg-accent-400' : 'bg-transparent')}
      />
      {label}
    </Link>
  );
}

function NavItemGated({ href, label, resource }: { href: string; label: string; resource: string | null }) {
  // Hooks can't be called conditionally, but a resource of `null` always
  // passes — this small wrapper keeps that decision colocated per item
  // rather than filtering the whole list with a hook called in a loop.
  const hasAccess = useHasResourceAccess(resource ?? '__always__');
  if (resource !== null && !hasAccess) return null;
  return <NavLink href={href} label={label} />;
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-graphite-800 bg-graphite-900">
      <div className="flex h-14 items-center gap-2 border-b border-graphite-800 px-5">
        <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden />
        <span className="text-sm font-semibold tracking-wide text-white">AutoNexa</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavItemGated key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
