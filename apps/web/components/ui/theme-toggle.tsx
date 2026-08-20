'use client';

import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-8 w-8 items-center justify-center rounded text-ink-secondary transition-colors hover:bg-surface-hover hover:text-ink"
    >
      {/* The server can't know the visitor's stored/system theme, so its
          markup always says "light"; the inline pre-hydration script in
          app/layout.tsx may have already picked dark before this ever
          paints. suppressHydrationWarning silences the resulting text-diff
          warning — there's no visible flash, the class was already correct
          on <html> before this rendered. */}
      <span suppressHydrationWarning aria-hidden className="text-base leading-none">
        {isDark ? '☀' : '☾'}
      </span>
    </button>
  );
}
