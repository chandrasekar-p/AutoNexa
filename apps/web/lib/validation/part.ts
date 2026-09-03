import { z } from 'zod';

// Mirrors the backend's CreatePartDto exactly. currentStock is
// deliberately absent — it's never client-settable (see the DTO's own
// comment: it only ever moves through InventoryTransaction-backed
// operations).
export const PART_UNITS = ['PIECE', 'LITRE', 'ML', 'KG', 'GRAM'] as const;

export const partSchema = z
  .object({
    partNumber: z.string().min(1, 'Part number is required'),
    sku: z.string().min(1, 'SKU is required'),
    name: z.string().min(1, 'Name is required'),
    categoryId: z.string().optional(),
    brand: z.string().optional(),
    vehicleCompatibility: z.string().optional(),
    supplierId: z.string().optional(),
    purchasePrice: z.number().min(0, 'Purchase price must be 0 or more'),
    sellingPrice: z.number().min(0, 'Selling price must be 0 or more'),
    gstRate: z.number().min(0, 'GST rate must be 0 or more'),
    hsnCode: z.string().optional(),
    unit: z.enum(PART_UNITS).optional(),
    minStock: z.union([z.number(), z.nan()]).optional(),
    maxStock: z.union([z.number(), z.nan()]).optional(),
    binLocation: z.string().optional(),
    warrantyPeriodMonths: z.union([z.number(), z.nan()]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const min = data.minStock;
      const max = data.maxStock;
      if (min === undefined || max === undefined || Number.isNaN(min) || Number.isNaN(max)) return true;
      return min <= max;
    },
    { message: 'Minimum stock cannot be greater than maximum stock.', path: ['minStock'] },
  );

export type PartFormValues = z.infer<typeof partSchema>;

export type PartFormErrors = Partial<Record<keyof PartFormValues, string>>;

export type PartValidationResult = { success: true; data: PartFormValues } | { success: false; errors: PartFormErrors };

const OPTIONAL_STRING_FIELDS = ['categoryId', 'brand', 'vehicleCompatibility', 'supplierId', 'hsnCode', 'binLocation'] as const;
const OPTIONAL_NUMBER_FIELDS = ['minStock', 'maxStock', 'warrantyPeriodMonths'] as const;

export function validatePartForm(values: unknown): PartValidationResult {
  const result = partSchema.safeParse(values);
  if (!result.success) {
    const errors: PartFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof PartFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  for (const key of OPTIONAL_STRING_FIELDS) {
    if (data[key] === '') data[key] = undefined;
  }
  for (const key of OPTIONAL_NUMBER_FIELDS) {
    if (typeof data[key] === 'number' && Number.isNaN(data[key])) data[key] = undefined;
  }
  return { success: true, data };
}
