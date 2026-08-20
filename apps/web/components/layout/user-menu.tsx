'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // See lib/auth/types.ts — `name` is only reliable right after a fresh
  // login this session; a page reload (silent refresh) has no source for
  // it, so we fall back to the email, which GET /auth/me always returns.
  const displayName = user?.name ?? user?.email ?? '';

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
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

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push('/login');
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          'flex h-9 items-center gap-2 rounded-full pl-1 pr-3 text-sm transition-colors',
          isOpen ? 'bg-surface-hover' : 'hover:bg-surface-hover',
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-micro font-semibold text-white">
          {initialsFor(displayName || '?')}
        </span>
        <span className="max-w-[10rem] truncate text-ink-secondary">{displayName}</span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-lg border border-line bg-surface shadow-card"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{user?.name ?? 'Account'}</p>
            {user?.email ? <p className="truncate text-xs text-ink-muted">{user.email}</p> : null}
          </div>
          <div className="flex flex-col p-1.5">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded px-2.5 py-2 text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink"
            >
              <UserIcon aria-hidden className="h-4 w-4" />
              Profile Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 disabled:opacity-60 dark:text-danger-400 dark:hover:bg-danger-500/10"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              {isLoggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
