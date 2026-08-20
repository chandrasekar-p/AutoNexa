export interface NavItem {
  label: string;
  href: string;
  /** Permission resource gating visibility (UX-only — see use-permission.ts). `null` = always visible. */
  resource: string | null;
}

// Every route from the Phase 1 architecture doc's Section 8 folder
// structure is listed here now, even though only /dashboard has a real
// page this phase — so the shell doesn't need rework as each subsequent
// frontend phase lands a module. Routes with no page yet render the
// shared "coming soon" placeholder rather than a raw 404.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', resource: null },
  { label: 'Customers', href: '/customers', resource: 'customer' },
  { label: 'Vehicles', href: '/vehicles', resource: 'vehicle' },
  { label: 'Appointments', href: '/appointments', resource: 'appointment' },
  { label: 'Job Cards', href: '/job-cards', resource: 'job-card' },
  { label: 'Parts & Inventory', href: '/parts-inventory', resource: 'part' },
  { label: 'Suppliers', href: '/suppliers', resource: 'supplier' },
  { label: 'Purchase Orders', href: '/purchases', resource: 'purchase' },
  { label: 'Invoices', href: '/invoices', resource: 'invoice' },
  { label: 'Reports', href: '/reports', resource: 'report' },
  { label: 'Settings', href: '/settings', resource: 'settings' },
];
