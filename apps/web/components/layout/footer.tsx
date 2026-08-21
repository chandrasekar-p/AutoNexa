/**
 * A persistent bar pinned to the bottom of the viewport, alongside the
 * scrollable <main> in the dashboard layout's flex column — same
 * fixed-chrome treatment as Topbar (border + bg-surface), not scrolling
 * away with page content. Same copyright line as the login page's footer
 * (see (auth)/layout.tsx), just styled to sit in the app shell instead of
 * floating over a photo backdrop.
 */
export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex h-9 shrink-0 items-center justify-center border-t border-line bg-surface px-4 text-center text-xs text-ink-muted">
      &copy; {year} AutoNexa. All rights reserved. &middot; Powered by ec2cloud IT Solutions
    </footer>
  );
}
