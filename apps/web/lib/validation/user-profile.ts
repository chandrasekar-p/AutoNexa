import { z } from 'zod';

// Mirrors the backend's UpdateOwnProfileDto (apps/api/src/modules/users/dto/update-own-profile.dto.ts)
// exactly — name/phone only. Email/role/isActive are deliberately not
// editable from this form; the backend doesn't accept them on PATCH
// /users/me either.
export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
});

export type UserProfileFormValues = z.infer<typeof userProfileSchema>;

export type UserProfileFormErrors = Partial<Record<keyof UserProfileFormValues, string>>;

export type UserProfileValidationResult =
  | { success: true; data: UserProfileFormValues }
  | { success: false; errors: UserProfileFormErrors };

export function validateUserProfileForm(values: unknown): UserProfileValidationResult {
  const result = userProfileSchema.safeParse(values);
  if (!result.success) {
    const errors: UserProfileFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof UserProfileFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  if (data.phone === '') data.phone = undefined;
  return { success: true, data };
}
