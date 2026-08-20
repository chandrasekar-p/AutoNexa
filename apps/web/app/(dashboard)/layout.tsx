'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // While the silent-refresh-on-mount is resolving, render nothing past a
  // loading state — never flash the shell (or the login redirect) before
  // we actually know whether there's a valid session.
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent-500" aria-hidden />
      </div>
    );
  }

  if (!user) {
    // The redirect effect above is in flight — render nothing so there's
    // no flash of dashboard content for an unauthenticated visitor.
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-canvas p-6">{children}</main>
      </div>
    </div>
  );
}
