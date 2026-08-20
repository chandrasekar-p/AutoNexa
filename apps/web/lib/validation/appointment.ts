import { z } from 'zod';

// Mirrors the backend's CreateAppointmentDto exactly, minus customerId/
// vehicleId — the caller (the page) attaches those, same pattern as
// vehicle.ts omits customerId. UpdateAppointmentDto excludes them
// server-side too, by design (a booking isn't reassigned through a plain edit).
export const appointmentSchema = z.object({
  serviceType: z.string().min(1, 'Service type is required'),
  appointmentDate: z.string().min(1, 'Date is required'),
  appointmentTime: z.string().min(1, 'Time is required'),
  serviceAdvisorId: z.string().optional(),
  technicianId: z.string().optional(),
  notes: z.string().optional(),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export type AppointmentFormErrors = Partial<Record<keyof AppointmentFormValues, string>>;

export type AppointmentValidationResult =
  | { success: true; data: AppointmentFormValues }
  | { success: false; errors: AppointmentFormErrors };

export function validateAppointmentForm(values: unknown): AppointmentValidationResult {
  const result = appointmentSchema.safeParse(values);
  if (!result.success) {
    const errors: AppointmentFormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof AppointmentFormValues;
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, errors };
  }

  const data = { ...result.data };
  if (data.serviceAdvisorId === '') data.serviceAdvisorId = undefined;
  if (data.technicianId === '') data.technicianId = undefined;
  if (data.notes === '') data.notes = undefined;
  return { success: true, data };
}
