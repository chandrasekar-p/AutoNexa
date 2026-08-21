import { z } from 'zod';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from './mobile';

// Mirrors the backend's CreateUserDto (apps/api/src/modules/users/dto/create-user.dto.ts) exactly.
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE).optional().or(z.literal('')),
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export type CreateUserFormErrors = Partial<Record<keyof CreateUserFormValues, string>>;

export type CreateUserValidationResult =
  | { success: true; data: CreateUserFormValues }
  | { success: false; errors: CreateUserFormErrors };

export function validateCreateUserForm(values: unknown): CreateUserValidationResult {
  const result = createUserSchema.safeParse(values);
  if (!result.success) {
    const errors: CreateUserFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CreateUserFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  if (data.phone === '') data.phone = undefined;
  return { success: true, data };
}
