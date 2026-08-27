import { z } from 'zod';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from './mobile';
import { GSTIN_REGEX, INVALID_GSTIN_MESSAGE } from './gstin';

// Mirrors the backend's CreateSupplierDto exactly — only name is required.
export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  mobile: z.string().regex(INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().regex(GSTIN_REGEX, INVALID_GSTIN_MESSAGE).optional().or(z.literal('')),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export type SupplierFormErrors = Partial<Record<keyof SupplierFormValues, string>>;

export type SupplierValidationResult =
  | { success: true; data: SupplierFormValues }
  | { success: false; errors: SupplierFormErrors };

export function validateSupplierForm(values: unknown): SupplierValidationResult {
  const result = supplierSchema.safeParse(values);
  if (!result.success) {
    const errors: SupplierFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof SupplierFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  for (const key of ['contactPerson', 'mobile', 'email', 'address', 'gstin', 'paymentTerms'] as const) {
    if (data[key] === '') data[key] = undefined;
  }
  return { success: true, data };
}
