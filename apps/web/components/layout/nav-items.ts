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
  UserCog,
  ShieldCheck,
  CalendarDays,
  PackageCheck,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  /** Permission resource gating visibility (UX-only — see use-permission.ts). `null` = always visible. */
  resource: string | null;
  icon: LucideIcon;
}

export interface NavSection {
  /** Omitted (undefined) for a section that shouldn't show a header — just Dashboard, at the top. */
  label?: string;
  items: NavItem[];
}

// Grouped the way a workshop owner actually thinks about the app — daily
// shop-floor work, inventory/purchasing, money, then admin — rather than one
// flat 16-item list. A section disappears entirely (header included) if the
// signed-in role can't see any item inside it — see Sidebar's filtering.
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: 'Dashboard', href: '/dashboard', resource: null, icon: LayoutDashboard }],
  },
  {
    label: 'Workshop',
    items: [
      { label: 'Customers', href: '/customers', resource: 'customer', icon: Users },
      { label: 'Vehicles', href: '/vehicles', resource: 'vehicle', icon: Car },
      { label: 'Appointments', href: '/appointments', resource: 'appointment', icon: CalendarClock },
      { label: 'Inspections', href: '/inspections', resource: 'inspection', icon: ClipboardCheck },
      { label: 'Estimates', href: '/estimates', resource: 'estimate', icon: FileText },
      { label: 'Job Cards', href: '/job-cards', resource: 'job-card', icon: ClipboardList },
      { label: 'Technicians', href: '/technicians', resource: 'technician', icon: Wrench },
      { label: 'Service Packages', href: '/service-packages', resource: 'service-package', icon: PackageCheck },
      { label: 'Warranty Claims', href: '/warranty-claims', resource: 'warranty-claim', icon: ShieldAlert },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Parts & Inventory', href: '/parts-inventory', resource: 'part', icon: Boxes },
      { label: 'Suppliers', href: '/suppliers', resource: 'supplier', icon: Truck },
      { label: 'Purchase Orders', href: '/purchases', resource: 'purchase', icon: ShoppingCart },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', href: '/invoices', resource: 'invoice', icon: Receipt },
      { label: 'Reports', href: '/reports', resource: 'report', icon: BarChart3 },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Attendance', href: '/attendance', resource: 'attendance', icon: CalendarDays },
      { label: 'Users', href: '/users', resource: 'user', icon: UserCog },
      { label: 'Roles', href: '/roles', resource: 'role', icon: ShieldCheck },
      { label: 'Settings', href: '/settings', resource: 'settings', icon: Settings },
    ],
  },
];

/** Flat view of every nav item, for anything that doesn't care about grouping. */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);
