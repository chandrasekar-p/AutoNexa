import { z } from 'zod';

// currentPassword/newPassword mirror the backend's ChangePasswordDto
// exactly (apps/api/src/modules/users/dto/change-password.dto.ts, min 8
// chars). confirmPassword is a client-only field — the backend never sees
// it, it just catches a typo before the request goes out.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export type ChangePasswordFormErrors = Partial<Record<keyof ChangePasswordFormValues, string>>;

export type ChangePasswordValidationResult =
  | { success: true; data: ChangePasswordFormValues }
  | { success: false; errors: ChangePasswordFormErrors };

export function validateChangePasswordForm(values: unknown): ChangePasswordValidationResult {
  const result = changePasswordSchema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: ChangePasswordFormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ChangePasswordFormValues;
    if (!errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
