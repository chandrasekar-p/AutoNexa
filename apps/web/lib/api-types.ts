/**
 * Response shapes for the endpoints this phase actually calls. Hand-shared
 * rather than generated (see apps/api/prisma/schema.prisma /
 * apps/api/README.md for the source of truth) — the Phase 1 architecture
 * doc's monorepo suggestion of a generated `packages/types` is a
 * reasonable future upgrade, not built here.
 *
 * Money/Decimal fields (Prisma.Decimal on the backend) serialize over JSON
 * as STRINGS, not numbers — decimal.js's toJSON() returns .toString(), and
 * the backend deliberately never uses floating-point for money. Every
 * money field below is typed `string` for exactly this reason; see
 * lib/format.ts's formatMoney for the one place that should ever parse one
 * for display.
 */

export type JobCardStatus =
  | 'OPEN'
  | 'DIAGNOSIS'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'QUALITY_CHECK'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface DashboardSummary {
  todaysAppointments: number;
  vehiclesInService: number;
  openJobCards: number;
  completedJobsToday: number;
  pendingEstimates: number;
  pendingPayments: { count: number; totalOutstanding: string };
  todaysSales: string;
  monthlySales: string;
  labourRevenueMonthly: string;
  partsRevenueMonthly: string;
  lowStockCount: number;
  technicianWorkload: Array<{ technicianId: string; name: string; jobsOpen: number }>;
}

export interface AlertsLowStockPart {
  id: string;
  partNumber: string;
  sku: string;
  name: string;
  currentStock: number;
  minStock: number;
}

export interface AlertsExpiringDocument {
  vehicleId: string;
  registrationNo: string;
  customer: { id: string; name: string; mobile: string } | null;
  insuranceExpiry: string | null;
  pucExpiry: string | null;
}

export interface AlertsDelayedJobCard {
  jobCardId: string;
  jobCardNumber: string;
  vehicle: { id: string; registrationNo: string; brand: string; model: string } | null;
  customer: { id: string; name: string; mobile: string } | null;
  status: JobCardStatus;
  expectedDelivery: string | null;
}

export interface NotificationAlerts {
  lowStockParts: AlertsLowStockPart[];
  expiringDocuments: AlertsExpiringDocument[];
  delayedJobCards: AlertsDelayedJobCard[];
}

export interface CurrentTenant {
  id: string;
  name: string;
  slug: string;
  gstin: string | null;
  planTier: string;
  isActive: boolean;
}

/** Shape returned by every paginated list endpoint (GET /customers, etc.) — see ListCustomersQueryDto and its siblings on the backend. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CustomerType = 'individual' | 'business';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  altMobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  gstin: string | null;
  customerType: CustomerType;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A customer's vehicle as embedded in GET /customers/:id — see CustomersService.findOne. */
export interface CustomerVehicle {
  id: string;
  registrationNo: string;
  vin: string | null;
  brand: string;
  model: string;
  variant: string | null;
  manufactureYear: number | null;
  fuelType: string | null;
  transmission: string | null;
  colour: string | null;
  odometerReading: number | null;
  insuranceExpiry: string | null;
  pucExpiry: string | null;
  createdAt: string;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

/** An invoice as embedded in GET /customers/:id, with the server-computed `outstanding` (grandTotal minus payments) — never recompute this client-side. */
export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  grandTotal: string;
  status: InvoiceStatus;
  outstanding: string;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  vehicles: CustomerVehicle[];
  invoices: CustomerInvoice[];
  totalOutstanding: string;
}

/** One point from GET /reports/sales — see sales-bucketing.ts's bucketSales(). `period` is "YYYY-MM-DD" (groupBy=day) or "YYYY-MM" (groupBy=month). */
export interface SalesBucket {
  period: string;
  total: string;
}

/** GET /reports/job-card-status — current pipeline distribution, sorted by count descending. */
export interface JobCardStatusCount {
  status: JobCardStatus;
  count: number;
}

/** GET/PATCH /users/me — email/roles/isActive are read-only from this endpoint (see UpdateOwnProfileDto on the backend); only name/phone are self-editable. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  branchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  roles: Array<{ role: { id: string; name: string } }>;
}
