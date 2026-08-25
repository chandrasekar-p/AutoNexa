/**
 * Computed fresh on every read from Vehicle.insuranceExpiry/pucExpiry —
 * same "computed status, never persisted" discipline as
 * computeWarrantyStatus/computeServiceDue. Powers both the Vehicles list
 * page's per-field expiry coloring (Insurance Expiry/PUC Expiry columns)
 * and its Insurance/PUC filter dropdowns — the exact same derivation
 * both places, so what a filter matches can never disagree with what's
 * shown on screen.
 */
export type ExpiryStatus = 'active' | 'expiring_soon' | 'expired' | 'not_set';

export function computeExpiryStatus(expiry: Date | null, now: Date = new Date(), soonDays = 30): ExpiryStatus {
  if (!expiry) return 'not_set';
  if (expiry.getTime() < now.getTime()) return 'expired';
  const soonThreshold = new Date(now.getTime() + soonDays * 24 * 60 * 60 * 1000);
  if (expiry.getTime() <= soonThreshold.getTime()) return 'expiring_soon';
  return 'active';
}

/**
 * The Vehicles list page's combined per-row STATUS badge — 'NO_DATA' only
 * when NEITHER insurance nor PUC has an expiry on file at all; 'EXPIRED'
 * if either one that IS set has expired; 'ACTIVE' otherwise (covers both
 * "both current" and "one set+current, one not set" — a vehicle with at
 * least one valid, non-expired document on file isn't "no data").
 */
export type VehicleStatus = 'ACTIVE' | 'EXPIRED' | 'NO_DATA';

export function computeVehicleStatus(insuranceExpiry: Date | null, pucExpiry: Date | null, now: Date = new Date()): VehicleStatus {
  const insurance = computeExpiryStatus(insuranceExpiry, now);
  const puc = computeExpiryStatus(pucExpiry, now);
  if (insurance === 'not_set' && puc === 'not_set') return 'NO_DATA';
  if (insurance === 'expired' || puc === 'expired') return 'EXPIRED';
  return 'ACTIVE';
}
