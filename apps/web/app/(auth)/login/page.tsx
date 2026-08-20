'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api-client';
import { validateLoginForm, type LoginFormErrors } from '@/lib/validation/login';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = validateLoginForm({ tenantSlug, email, password });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      await login(result.data.tenantSlug, result.data.email, result.data.password);
      router.push('/dashboard');
    } catch (err) {
      // The backend deliberately doesn't reveal which field was wrong
      // ("Invalid workshop, email, or password" for any of the three) —
      // we surface its exact message rather than inventing friendlier
      // copy that would leak more than the backend intends to.
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-8 shadow-panel">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="h-2.5 w-2.5 rounded-full bg-accent-500" aria-hidden />
        <h1 className="text-lg font-semibold text-ink">AutoNexa</h1>
        <p className="text-xs text-ink-secondary">Sign in to your workshop</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="tenantSlug"
          name="tenantSlug"
          label="Workshop ID"
          autoComplete="organization"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          placeholder="demo-workshop"
          error={errors.tenantSlug}
        />

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@demoworkshop.test"
          error={errors.email}
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        {formError ? (
          <p
            role="alert"
            className="rounded border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
