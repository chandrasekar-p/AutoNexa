import { z } from 'zod';
import { INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE } from './mobile';

// Mirrors the backend's CreateCustomerDto (apps/api/src/modules/customers/dto/create-customer.dto.ts)
// exactly — only name/mobile are required, matching the backend's own
// @IsNotEmpty() placement, so this never rejects something the backend
// would accept or vice versa.
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile number is required').regex(INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE),
  altMobile: z.string().regex(INDIAN_MOBILE_REGEX, INVALID_MOBILE_MESSAGE).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().optional(),
  customerType: z.enum(['individual', 'business']),
  notes: z.string().optional(),
  reminderOptOut: z.boolean().optional(),
  notifyByWhatsappSms: z.boolean().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>>;

export type CustomerValidationResult =
  | { success: true; data: CustomerFormValues }
  | { success: false; errors: CustomerFormErrors };

/**
 * Pure wrapper around customerSchema.safeParse, same shape as
 * validateLoginForm — takes raw form values, returns parsed data or a
 * per-field error map the form renders directly. Blank optional strings
 * are normalized to undefined so an empty field doesn't get sent to the
 * backend as `""` instead of simply omitted.
 */
export function validateCustomerForm(values: unknown): CustomerValidationResult {
  const result = customerSchema.safeParse(values);
  if (!result.success) {
    const errors: CustomerFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof CustomerFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  for (const key of ['altMobile', 'email', 'address', 'city', 'state', 'gstin', 'notes'] as const) {
    if (data[key] === '') data[key] = undefined;
  }
  return { success: true, data };
}
