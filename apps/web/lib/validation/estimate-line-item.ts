import { z } from 'zod';

// Mirrors the backend's CreateEstimateLineItemDto exactly — lineTotal is
// deliberately absent, it's always server-computed (see
// apps/api/src/modules/estimates/estimate-totals.ts) and never sent by
// this form.
export const estimateLineItemSchema = z.object({
  itemType: z.enum(['LABOUR', 'PART', 'CONSUMABLE']),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price must be 0 or more'),
  gstRate: z.number().min(0, 'GST rate must be 0 or more'),
});

export type EstimateLineItemFormValues = z.infer<typeof estimateLineItemSchema>;

export type EstimateLineItemFormErrors = Partial<Record<keyof EstimateLineItemFormValues, string>>;

export type EstimateLineItemValidationResult =
  | { success: true; data: EstimateLineItemFormValues }
  | { success: false; errors: EstimateLineItemFormErrors };

export function validateEstimateLineItemForm(values: unknown): EstimateLineItemValidationResult {
  const result = estimateLineItemSchema.safeParse(values);
  if (!result.success) {
    const errors: EstimateLineItemFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof EstimateLineItemFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}
