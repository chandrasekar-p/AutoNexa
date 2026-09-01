'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { AppFooter } from '@/components/layout/footer';
import { TrialStatusBanner } from '@/components/domain/trial-status-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Safety net alongside Sidebar's own onNavigate close — covers any route
  // change the drawer didn't itself trigger (e.g. browser back/forward).
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

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
      <Sidebar mobileOpen={isMobileNavOpen} onMobileClose={() => setIsMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onOpenMobileNav={() => setIsMobileNavOpen(true)} />
        <TrialStatusBanner />
        <main className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-6">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
