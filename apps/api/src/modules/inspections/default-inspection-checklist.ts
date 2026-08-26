import { InspectionCategory } from '@prisma/client';

/**
 * Standard exterior/interior/mechanical checklist (Phase 1, Section 9).
 * Same role as default-role-grants.ts for roles: a single source of truth
 * the service seeds from when an inspection is created — POST /inspections
 * doesn't require the caller to list every item by hand. Ad-hoc items can
 * still be added on top via POST /inspections/:id/items.
 */
export const DEFAULT_INSPECTION_CHECKLIST: Record<InspectionCategory, string[]> = {
  [InspectionCategory.EXTERIOR]: [
    'Body & Paint',
    'Windshield & Glass',
    'Headlights',
    'Taillights & Indicators',
    'Tyres & Wheels',
    'Wipers',
  ],
  [InspectionCategory.INTERIOR]: [
    'AC / Climate Control',
    'Dashboard Warning Lights',
    'Seats & Upholstery',
    'Horn',
    'Infotainment System',
  ],
  [InspectionCategory.MECHANICAL]: [
    'Engine Oil',
    'Brakes',
    'Battery',
    'Coolant Level',
    'Suspension',
    'Belts & Hoses',
    'Exhaust System',
  ],
  [InspectionCategory.ELECTRICAL]: [
    'Alternator / Charging System',
    'Fuses & Relays',
    'Central Locking',
    'Power Windows & Mirrors',
  ],
  [InspectionCategory.UNDERBODY]: [
    'Chassis & Frame',
    'Underbody Guard / Skid Plate',
    'Drive Shaft & CV Joints',
    'Fuel Tank & Lines',
    'Silencer & Muffler',
  ],
};
