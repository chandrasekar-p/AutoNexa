import { z } from 'zod';

// Mirrors the backend's LoginDto (apps/api/src/modules/auth/dto/login.dto.ts)
// exactly — tenantSlug/email/password all required, no client-side
// invention of extra rules the backend doesn't also enforce.
export const loginSchema = z.object({
  tenantSlug: z.string().min(1, 'Workshop ID is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

export type LoginValidationResult =
  | { success: true; data: LoginFormValues }
  | { success: false; errors: LoginFormErrors };

/**
 * Pure wrapper around loginSchema.safeParse — takes raw (possibly
 * malformed) form values, returns either the parsed data or a per-field
 * error map the form can render directly. Kept separate from the form
 * component so it's unit-testable without rendering anything.
 */
export function validateLoginForm(values: unknown): LoginValidationResult {
  const result = loginSchema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: LoginFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof LoginFormValues;
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
