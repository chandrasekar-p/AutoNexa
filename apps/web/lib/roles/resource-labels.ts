/**
 * Display names for the raw kebab-case `resource` strings GET /permissions
 * returns (see apps/api's default-role-grants.ts RESOURCES) — that list has
 * no display-name field of its own. Covers every resource that exists
 * today; labelForResource() falls back to auto-title-casing anything new
 * so a future resource never renders blank.
 */
export const RESOURCE_LABELS: Record<string, string> = {
  tenant: 'Workshop',
  branch: 'Branches',
  user: 'Users',
  role: 'Roles',
  customer: 'Customers',
  vehicle: 'Vehicles',
  appointment: 'Appointments',
  inspection: 'Inspections',
  estimate: 'Estimates',
  'job-card': 'Job Cards',
  labour: 'Labour',
  technician: 'Technicians',
  part: 'Parts',
  inventory: 'Inventory',
  supplier: 'Suppliers',
  purchase: 'Purchase Orders',
  invoice: 'Invoices',
  payment: 'Payments',
  report: 'Reports',
  'audit-log': 'Audit Log',
  settings: 'Settings',
  attendance: 'Attendance',
  'service-package': 'Service Packages',
  loyalty: 'Loyalty',
  'warranty-claim': 'Warranty Claims',
  'gst-export': 'GST Export',
};

function autoTitleCase(resource: string): string {
  return resource
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function labelForResource(resource: string): string {
  return RESOURCE_LABELS[resource] ?? autoTitleCase(resource);
}
