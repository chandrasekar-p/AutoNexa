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
