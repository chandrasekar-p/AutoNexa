import { LoginBackdrop } from '@/components/layout/login-backdrop';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <LoginBackdrop />
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
