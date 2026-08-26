/**
 * Curated, not exhaustive — Technician.specialisation is a free-text
 * column with no backend enum/config behind it, so this is a fast-entry
 * list only. "Other" always falls back to free text so an existing
 * record's non-canonical value is never hidden from the dropdown, same
 * pattern as india-states.ts/vehicle-brands.ts.
 */
export const TECHNICIAN_SPECIALISATIONS: string[] = [
  'General Technician',
  'Engine Specialist',
  'AC Specialist',
  'Electrical Specialist',
  'Diagnostics Specialist',
  'Transmission Specialist',
  'Body & Paint',
  'Detailing',
];

export const OTHER_SPECIALISATION = 'Other (type manually)';

/** A few common quick-add suggestions for the skills tag input — not a closed set, Technician.skills accepts any free text. */
export const SUGGESTED_SKILLS: string[] = [
  'Engine',
  'Electrical',
  'AC',
  'Diagnostics',
  'Brakes',
  'Transmission',
  'Suspension',
  'Body Work',
  'Painting',
  'Detailing',
];
