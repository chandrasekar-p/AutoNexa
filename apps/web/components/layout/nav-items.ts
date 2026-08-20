import {
  LayoutDashboard,
  Users,
  Car,
  CalendarClock,
  ClipboardCheck,
  FileText,
  ClipboardList,
  Wrench,
  Boxes,
  Truck,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  /** Permission resource gating visibility (UX-only — see use-permission.ts). `null` = always visible. */
  resource: string | null;
  icon: LucideIcon;
}

// Every route from the Phase 1 architecture doc's Section 8 folder
// structure is listed here now, even though only /dashboard has a real
// page this phase — so the shell doesn't need rework as each subsequent
// frontend phase lands a module. Routes with no page yet render the
// shared "coming soon" placeholder rather than a raw 404.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', resource: null, icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', resource: 'customer', icon: Users },
  { label: 'Vehicles', href: '/vehicles', resource: 'vehicle', icon: Car },
  { label: 'Appointments', href: '/appointments', resource: 'appointment', icon: CalendarClock },
  { label: 'Inspections', href: '/inspections', resource: 'inspection', icon: ClipboardCheck },
  { label: 'Estimates', href: '/estimates', resource: 'estimate', icon: FileText },
  { label: 'Job Cards', href: '/job-cards', resource: 'job-card', icon: ClipboardList },
  { label: 'Technicians', href: '/technicians', resource: 'technician', icon: Wrench },
  { label: 'Parts & Inventory', href: '/parts-inventory', resource: 'part', icon: Boxes },
  { label: 'Suppliers', href: '/suppliers', resource: 'supplier', icon: Truck },
  { label: 'Purchase Orders', href: '/purchases', resource: 'purchase', icon: ShoppingCart },
  { label: 'Invoices', href: '/invoices', resource: 'invoice', icon: Receipt },
  { label: 'Reports', href: '/reports', resource: 'report', icon: BarChart3 },
  { label: 'Settings', href: '/settings', resource: 'settings', icon: Settings },
];
