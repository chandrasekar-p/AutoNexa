import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { EnterKeyFieldNavigation } from '@/components/layout/enter-key-field-navigation';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'AutoNexa',
  description: 'Workshop management for premium multi-brand automotive service centres.',
};

// Sets the `dark` class on <html> before React hydrates, from a stored
// preference or (on a first-ever visit) the OS preference — otherwise the
// page would always paint light first and snap to dark a moment later.
// Runs pre-hydration, so it can't be a React effect; a blocking inline
// script in <head> is the standard fix (see lib/theme/theme-context.tsx,
// which reads this same decision back as its initial state).
const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = localStorage.getItem('autonexa-theme');
    var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <EnterKeyFieldNavigation />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
