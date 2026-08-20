import { z } from 'zod';

// Mirrors the backend's CreateInvoicePaymentDto exactly.
export const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.string().optional(),
  method: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'credit']),
  referenceNumber: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export type PaymentFormErrors = Partial<Record<keyof PaymentFormValues, string>>;

export type PaymentValidationResult = { success: true; data: PaymentFormValues } | { success: false; errors: PaymentFormErrors };

export function validatePaymentForm(values: unknown): PaymentValidationResult {
  const result = paymentSchema.safeParse(values);
  if (!result.success) {
    const errors: PaymentFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof PaymentFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  if (data.paymentDate === '') data.paymentDate = undefined;
  if (data.referenceNumber === '') data.referenceNumber = undefined;
  return { success: true, data };
}
