import { LoginBackdrop } from '@/components/layout/login-backdrop';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <LoginBackdrop />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
      <footer className="relative z-10 rounded-full border border-white/10 bg-graphite-900/60 px-4 py-1.5 text-center text-xs text-white shadow-panel backdrop-blur-sm">
        &copy; {year} AutoNexa. All rights reserved.
      </footer>
    </div>
  );
}
