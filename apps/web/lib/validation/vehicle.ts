import { z } from 'zod';

// Mirrors the backend's CreateVehicleDto (apps/api/src/modules/vehicles/dto/create-vehicle.dto.ts)
// exactly, minus `customerId` — the caller (the page) always attaches that
// separately, since which customer a vehicle belongs to is decided outside
// this form (see components/domain/vehicle-form.tsx). UpdateVehicleDto
// excludes customerId server-side too, by design — a vehicle isn't
// reassigned through a plain edit.
export const vehicleSchema = z.object({
  registrationNo: z.string().min(1, 'Registration number is required'),
  vin: z.string().optional(),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  manufactureYear: z
    .union([z.number(), z.nan()])
    .optional()
    .refine((v) => v === undefined || Number.isNaN(v) || v >= 1980, 'Enter a valid year'),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'cng']).optional().or(z.literal('')),
  transmission: z.enum(['manual', 'automatic']).optional().or(z.literal('')),
  colour: z.string().optional(),
  odometerReading: z
    .union([z.number(), z.nan()])
    .optional()
    .refine((v) => v === undefined || Number.isNaN(v) || v >= 0, 'Enter a valid odometer reading'),
  insuranceExpiry: z.string().optional(),
  pucExpiry: z.string().optional(),
  warrantyInfo: z.string().optional(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

export type VehicleFormErrors = Partial<Record<keyof VehicleFormValues, string>>;

export type VehicleValidationResult =
  | { success: true; data: VehicleFormValues }
  | { success: false; errors: VehicleFormErrors };

const OPTIONAL_STRING_FIELDS = [
  'vin',
  'variant',
  'colour',
  'insuranceExpiry',
  'pucExpiry',
  'warrantyInfo',
  'purchaseDate',
  'notes',
  'photoUrl',
] as const;

/**
 * Pure wrapper around vehicleSchema.safeParse, same shape as
 * validateCustomerForm — takes raw form values (including blank strings
 * from empty number/select inputs), returns parsed data or a per-field
 * error map. Blank optional strings and NaN numbers are normalized to
 * undefined so they're omitted from the request rather than sent as `""`
 * or `NaN`.
 */
export function validateVehicleForm(values: unknown): VehicleValidationResult {
  const result = vehicleSchema.safeParse(values);
  if (!result.success) {
    const errors: VehicleFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof VehicleFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  for (const key of OPTIONAL_STRING_FIELDS) {
    if (data[key] === '') data[key] = undefined;
  }
  if (data.fuelType === '') data.fuelType = undefined;
  if (data.transmission === '') data.transmission = undefined;
  if (typeof data.manufactureYear === 'number' && Number.isNaN(data.manufactureYear)) {
    data.manufactureYear = undefined;
  }
  if (typeof data.odometerReading === 'number' && Number.isNaN(data.odometerReading)) {
    data.odometerReading = undefined;
  }
  return { success: true, data };
}
