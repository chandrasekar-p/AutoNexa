'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

/**
 * Deliberately its own shell, not the workshop Sidebar/Topbar — a Super
 * Admin logs in via the "platform" tenant, which has no workshop data of
 * its own, and this surface manages OTHER tenants, not this one's day-to-
 * day operations. Kept minimal on purpose (see today's scope: demo-ready
 * platform admin, not a full second app).
 */
export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || !user.isSuperAdmin) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent-500" aria-hidden />
      </div>
    );
  }

  if (!user || !user.isSuperAdmin) {
    // The redirect effect above is in flight — no flash of admin content
    // for a non-super-admin visitor.
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-3">
        <Link href="/admin/workshops" className="text-sm font-semibold text-ink">
          AutoNexa <span className="text-accent-600">Platform Admin</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-secondary">{user.email}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            Log out
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
