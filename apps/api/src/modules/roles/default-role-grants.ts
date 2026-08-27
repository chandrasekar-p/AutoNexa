/**
 * Single source of truth for the permission catalogue and each default
 * tenant role's grants (mirrors the Phase 1 roles/permissions matrix).
 * Used by:
 *  - prisma/seed.ts          (local/dev seeding)
 *  - TenantsService          (provisioning a brand-new workshop tenant)
 */

export const RESOURCES = [
  'tenant',
  'branch',
  'user',
  'role',
  'customer',
  'vehicle',
  'appointment',
  'inspection',
  'estimate',
  'job-card',
  'labour',
  'technician',
  'part',
  'inventory',
  'supplier',
  'purchase',
  'invoice',
  'payment',
  'report',
  'audit-log',
  'settings',
  'attendance',
  'service-package',
  'loyalty',
  'warranty-claim',
  'gst-export',
] as const;

export const ACTIONS = ['create', 'read', 'update', 'delete'] as const;

export const DEFAULT_ROLE_GRANTS: Record<string, Record<string, string[] | '*'>> = {
  'Workshop Owner': Object.fromEntries(RESOURCES.map((r) => [r, '*'])),
  'Workshop Manager': {
    branch: ['read', 'update'],
    user: ['create', 'read', 'update'],
    customer: '*',
    vehicle: '*',
    appointment: '*',
    inspection: '*',
    estimate: '*',
    'job-card': '*',
    labour: ['read', 'update'],
    technician: '*',
    // Full inventory access per the Phase 1 role matrix — was previously
    // read-only on both, which didn't actually let a Workshop Manager
    // create/edit parts or record stock adjustments despite the role's
    // own description.
    part: '*',
    inventory: '*',
    supplier: ['read'],
    purchase: ['read'],
    // Full access — was previously read-only on both, which didn't let a
    // Workshop Manager generate an invoice or record a payment for a job
    // card they otherwise have full control over end-to-end. Same class
    // of fix as the part/inventory grants above.
    invoice: '*',
    payment: '*',
    report: '*',
    'audit-log': ['read'],
    settings: ['read', 'update'],
    attendance: '*',
    'service-package': '*',
    loyalty: '*',
    'warranty-claim': '*',
    'gst-export': ['read'],
  },
  'Service Advisor': {
    customer: '*',
    vehicle: '*',
    appointment: '*',
    inspection: '*',
    estimate: '*',
    'job-card': ['create', 'read', 'update'],
    labour: ['read'],
    // Read-only — seeing who's available/busy to assign a job is core to
    // this role, but creating/editing technician profiles stays manager-only.
    technician: ['read'],
    part: ['read'],
    invoice: ['create', 'read'],
    report: ['read'],
    'service-package': ['create', 'read', 'update'],
    loyalty: ['read', 'update'],
    // create+read only — raising a suspected comeback is fine for anyone
    // doing intake, but approving/rejecting it (:update) is manager-only.
    'warranty-claim': ['create', 'read'],
  },
  Accountant: {
    customer: ['read'],
    vehicle: ['read'],
    estimate: ['read'],
    'job-card': ['read'],
    part: ['read'],
    supplier: '*',
    purchase: '*',
    invoice: '*',
    payment: '*',
    report: ['read'],
    'service-package': ['read'],
    loyalty: ['read', 'update'],
    'warranty-claim': ['read'],
    'gst-export': ['read'],
  },
  'Inventory Manager': {
    part: '*',
    inventory: '*',
    supplier: '*',
    purchase: '*',
    'job-card': ['read'],
    report: ['read'],
  },
  Technician: {
    vehicle: ['read'],
    appointment: ['read'],
    inspection: ['create', 'read', 'update'],
    'job-card': ['read', 'update'],
    part: ['read'],
    // Same create+read-only tier as Service Advisor — approval stays manager-only.
    'warranty-claim': ['create', 'read'],
  },
  Receptionist: {
    customer: ['create', 'read'],
    vehicle: ['create', 'read'],
    appointment: ['create', 'read', 'update'],
    'job-card': ['read'],
    invoice: ['read'],
    'service-package': ['read'],
  },
};
