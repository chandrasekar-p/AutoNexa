export interface ServiceTypePreset {
  label: string;
  estimatedDurationMinutes: number;
}

/**
 * Curated fast-entry list for booking, not a workshop's full service
 * catalogue (that's Service Packages/Labour Items) — "Other" always
 * falls back to free text so a non-listed service is never blocked.
 * Duration is a client-only scheduling hint, never sent to the backend:
 * Appointment has no estimatedDuration column.
 */
export const SERVICE_TYPE_PRESETS: ServiceTypePreset[] = [
  { label: 'General Service', estimatedDurationMinutes: 90 },
  { label: 'Periodic Maintenance', estimatedDurationMinutes: 120 },
  { label: 'Oil Change', estimatedDurationMinutes: 30 },
  { label: 'Brake Inspection / Service', estimatedDurationMinutes: 60 },
  { label: 'AC Service', estimatedDurationMinutes: 60 },
  { label: 'Battery Replacement', estimatedDurationMinutes: 20 },
  { label: 'Tyre Replacement / Rotation', estimatedDurationMinutes: 45 },
  { label: 'Wheel Alignment & Balancing', estimatedDurationMinutes: 45 },
  { label: 'Engine Diagnostics', estimatedDurationMinutes: 60 },
  { label: 'Denting & Painting', estimatedDurationMinutes: 240 },
  { label: 'Insurance Claim Inspection', estimatedDurationMinutes: 30 },
  { label: 'Pre-Purchase Inspection', estimatedDurationMinutes: 45 },
];

export const OTHER_SERVICE_TYPE = 'Other (type manually)';

export function estimatedDurationFor(serviceType: string): number | null {
  const preset = SERVICE_TYPE_PRESETS.find((p) => p.label === serviceType);
  return preset ? preset.estimatedDurationMinutes : null;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
