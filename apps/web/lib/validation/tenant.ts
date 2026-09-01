import { z } from 'zod';

// Mirrors the backend's CreateTenantDto (apps/api/src/modules/tenants/dto/create-tenant.dto.ts) exactly.
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Workshop name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  gstin: z.string().optional().or(z.literal('')),
  ownerName: z.string().min(1, "Owner's name is required"),
  ownerEmail: z.string().min(1, 'Owner email is required').email('Enter a valid email address'),
  ownerPassword: z.string().min(8, 'Password must be at least 8 characters'),
  planTier: z.enum(['trial', 'starter', 'pro']),
  trialDays: z.number().int().min(1).optional(),
});

export type CreateTenantFormValues = z.infer<typeof createTenantSchema>;

export type CreateTenantFormErrors = Partial<Record<keyof CreateTenantFormValues, string>>;

export type CreateTenantValidationResult =
  | { success: true; data: CreateTenantFormValues }
  | { success: false; errors: CreateTenantFormErrors };

export function validateCreateTenantForm(values: unknown): CreateTenantValidationResult {
  const result = createTenantSchema.safeParse(values);
  if (!result.success) {
    const errors: CreateTenantFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CreateTenantFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  if (data.gstin === '') data.gstin = undefined;
  if (data.planTier !== 'trial') data.trialDays = undefined;
  return { success: true, data };
}
