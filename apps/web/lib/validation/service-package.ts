import { z } from 'zod';

// Mirrors the backend's CreateServicePackageDto — only name/price/gstRate/validityMonths are required.
export const servicePackageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  gstRate: z.coerce.number().min(0, 'GST rate cannot be negative'),
  validityMonths: z.coerce.number().int('Must be a whole number').min(1, 'Must be at least 1 month'),
  visitLimit: z.union([z.coerce.number().int().min(1), z.literal('')]).optional(),
  isActive: z.boolean(),
  labourItemIds: z.array(z.string()),
  partIds: z.array(z.string()),
  partCategoryIds: z.array(z.string()),
});

export type ServicePackageFormValues = z.infer<typeof servicePackageSchema>;

export type ServicePackageFormErrors = Partial<Record<keyof ServicePackageFormValues, string>>;

export type ServicePackageValidationResult =
  | { success: true; data: ServicePackageFormValues }
  | { success: false; errors: ServicePackageFormErrors };

export function validateServicePackageForm(values: unknown): ServicePackageValidationResult {
  const result = servicePackageSchema.safeParse(values);
  if (!result.success) {
    const errors: ServicePackageFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ServicePackageFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  if (data.description === '') data.description = undefined;
  if (data.visitLimit === '') data.visitLimit = undefined;
  return { success: true, data };
}
