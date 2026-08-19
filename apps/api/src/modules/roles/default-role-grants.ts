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
    part: ['read'],
    inventory: ['read'],
    supplier: ['read'],
    purchase: ['read'],
    invoice: ['read'],
    payment: ['read'],
    report: '*',
    'audit-log': ['read'],
    settings: ['read', 'update'],
  },
  'Service Advisor': {
    customer: '*',
    vehicle: '*',
    appointment: '*',
    inspection: '*',
    estimate: '*',
    'job-card': ['create', 'read', 'update'],
    labour: ['read'],
    part: ['read'],
    invoice: ['create', 'read'],
    report: ['read'],
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
  },
  Receptionist: {
    customer: ['create', 'read'],
    vehicle: ['create', 'read'],
    appointment: ['create', 'read', 'update'],
    'job-card': ['read'],
    invoice: ['read'],
  },
};
