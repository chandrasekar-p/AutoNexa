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
    <div className="rounded-lg border border-graphite-800 bg-graphite-900 p-8 shadow-panel">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="h-2.5 w-2.5 rounded-full bg-accent-500" aria-hidden />
        <h1 className="text-lg font-semibold text-white">AutoNexa</h1>
        <p className="text-xs text-graphite-400">Sign in to your workshop</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tenantSlug" className="text-xs font-medium text-graphite-300">
            Workshop ID
          </label>
          <input
            id="tenantSlug"
            name="tenantSlug"
            autoComplete="organization"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="demo-workshop"
            aria-invalid={errors.tenantSlug ? true : undefined}
            className="h-10 rounded border border-graphite-700 bg-graphite-850 px-3 text-sm text-white placeholder:text-graphite-500 focus:border-accent-400"
          />
          {errors.tenantSlug ? <p className="text-xs text-danger-400">{errors.tenantSlug}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-graphite-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@demoworkshop.test"
            aria-invalid={errors.email ? true : undefined}
            className="h-10 rounded border border-graphite-700 bg-graphite-850 px-3 text-sm text-white placeholder:text-graphite-500 focus:border-accent-400"
          />
          {errors.email ? <p className="text-xs text-danger-400">{errors.email}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-medium text-graphite-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            className="h-10 rounded border border-graphite-700 bg-graphite-850 px-3 text-sm text-white placeholder:text-graphite-500 focus:border-accent-400"
          />
          {errors.password ? <p className="text-xs text-danger-400">{errors.password}</p> : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded border border-danger-800 bg-danger-900/40 px-3 py-2 text-xs text-danger-300">
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
