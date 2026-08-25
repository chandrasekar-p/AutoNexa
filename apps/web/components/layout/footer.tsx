/**
 * A persistent bar pinned to the bottom of the viewport, alongside the
 * scrollable <main> in the dashboard layout's flex column — same
 * fixed-chrome treatment as Topbar (border + bg-surface), not scrolling
 * away with page content. Same copyright line as the login page's footer
 * (see (auth)/layout.tsx), just styled to sit in the app shell instead of
 * floating over a photo backdrop.
 */
// Keep in sync with package.json's "version" — no build-time plumbing for
// a single footer string, just a manual mirror.
const APP_VERSION = '1.1.0';

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-4 text-xs text-ink-muted">
      <span />
      <span className="text-center">
        &copy; {year} AutoNexa. All rights reserved. &middot; Powered by ec2cloud IT Solutions
      </span>
      <span className="num shrink-0">Version {APP_VERSION}</span>
    </footer>
  );
}
