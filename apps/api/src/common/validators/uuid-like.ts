/**
 * A "looks like a UUID" shape check (8-4-4-4-12 hex digits) — NOT strict
 * RFC4122 version/variant validation like class-validator's @IsUUID(),
 * which additionally requires the version nibble to be 1-5. This
 * project's demo seed data hardcodes two vehicle ids as
 * "00000000-0000-0000-0000-00000000000{1,2}" for memorability (see
 * prisma/seed.ts) — UUID-shaped, but version nibble 0, so @IsUUID()
 * rejects them outright. Any endpoint taking one of these ids back as a
 * filter/body field (vehicleId on inspections/estimates/job-cards/
 * appointments) failed with "vehicleId must be a UUID" for exactly these
 * two demo vehicles in production. Real Prisma-generated ids
 * (`@default(uuid())`) are always valid v4 UUIDs and pass this too, so
 * swapping to this is a pure loosening, not a weaker guarantee for
 * anything else.
 */
export const UUID_SHAPE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const INVALID_UUID_MESSAGE = 'must be a valid id';
