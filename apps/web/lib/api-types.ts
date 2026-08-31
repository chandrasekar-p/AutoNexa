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

export type JobCardPriority = 'NORMAL' | 'HIGH' | 'URGENT';
/** Purely derived, never stored — see the backend's job-card-delay.ts. Null when not applicable (no expectedDelivery, or already DELIVERED/CANCELLED). */
export type JobCardDelayStatus = 'ON_TRACK' | 'DUE_TODAY' | 'DELAYED';

/** The money fields are omitted entirely (not present, not null) unless the caller has report:read — see DashboardService.summary's canViewFinancials gate. Render each one conditionally, not with a fallback value. */
export interface DashboardSummary {
  totalCustomers: number;
  newCustomersThisWeek: number;
  todaysAppointments: number;
  vehiclesInService: number;
  openJobCards: number;
  completedJobsToday: number;
  pendingEstimates: number;
  pendingPayments?: { count: number; totalOutstanding: string };
  todaysSales?: string;
  /** null when yesterday had zero sales — see DashboardService.summary, showing a % off a zero base is meaningless. */
  salesChangeVsYesterdayPct?: number | null;
  monthlySales?: string;
  labourRevenueMonthly?: string;
  partsRevenueMonthly?: string;
  lowStockCount: number;
  technicianWorkload: Array<{ technicianId: string; name: string; jobsOpen: number }>;
  technicianWorkloadScope: 'mine' | 'all';
  todaysWorkshop: Array<{
    id: string;
    status: JobCardStatus;
    complaint: string | null;
    vehicle: { id: string; registrationNo: string; brand: string; model: string; photoUrl: string | null };
    customerId: string;
    customerName: string;
    technicianName: string | null;
    technicianAvatarUrl: string | null;
  }>;
}

/** GET /notifications — the in-app staff bell, not the outbound customer messaging DeliveryLog. `relatedEntityType`/`Id` are set for most triggers (JobCard/Invoice/Estimate/...) but not guaranteed — NotificationBell only links through when it recognizes the type. */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
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

/** GET/PATCH /tenants/me/settings — jobCard/invoice/estimate/poPrefix seed each module's sequence numbers (JC-0001, INV-0001, ...); `state` determines CGST+SGST vs IGST on generated invoices. */
export interface TenantSettings {
  id: string;
  jobCardPrefix: string;
  invoicePrefix: string;
  estimatePrefix: string;
  poPrefix: string;
  defaultGstRate: string;
  timezone: string;
  currency: string;
  state: string | null;
  /** Relative path from POST /uploads — resolve with lib/uploads.ts's resolveUploadUrl before use in an <img src>. Printed on this workshop's own exported PDF reports. */
  logoUrl: string | null;
  /** Incoming webhook URL for this workshop's own Slack — internal ops pings only (new appointment, invoice issued, ...), never customer-facing. */
  slackWebhookUrl: string | null;
  /** "HH:mm" 24h, e.g. "09:00" — both null means business hours were never set; see lib/workshop-hours.ts for the derived Open/Closed status. */
  businessHoursOpen: string | null;
  businessHoursClose: string | null;
  /** Toggles for the customer-facing reminder cron (reminder-cron.service.ts) — see ReminderSettingsCard. */
  reminderInsuranceEnabled: boolean;
  reminderPucEnabled: boolean;
  reminderServiceDueEnabled: boolean;
  /** Days-before-due thresholds shared by insurance/PUC/service-due date reminders, e.g. [30, 15, 7]. */
  reminderThresholdDays: number[];
  serviceIntervalMonths: number;
  serviceIntervalKm: number;
  /** Which channel(s) customer-facing notifications are sent through — independent of whether the underlying provider (SMTP/Twilio/WhatsApp Cloud API) is configured. See NotificationChannelsCard. */
  notifyByEmail: boolean;
  notifyBySms: boolean;
  notifyByWhatsapp: boolean;
  updatedAt: string;
}

export type DeliveryChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'SLACK';
export type DeliveryStatus = 'SENT' | 'FAILED' | 'SKIPPED';

/** One row per outbound message attempt — see GET /messaging/deliveries. */
export interface DeliveryLog {
  id: string;
  channel: DeliveryChannel;
  event: string;
  recipient: string;
  status: DeliveryStatus;
  errorMessage: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

export interface BranchRef {
  id: string;
  name: string;
  city: string | null;
}

/** GET /tenants/me — requires tenant:read, which only Workshop Owner gets by default. */
export interface CurrentTenant {
  id: string;
  name: string;
  slug: string;
  gstin: string | null;
  planTier: string;
  isActive: boolean;
  settings: TenantSettings;
  branches: BranchRef[];
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
  customerNumber: string | null;
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
  /** Opts out of the proactive insurance/PUC/service-due reminder cron only — transactional messages are never affected. */
  reminderOptOut: boolean;
  /** Whether this customer wants WhatsApp/SMS at all — distinct from the workshop-wide channel toggles in Settings. Email is never gated by this. */
  notifyByWhatsappSms: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /customers list items — enriched with a real vehicle count and the customer's most recent job card date (see CustomersService.findAll's LIST_INCLUDE/toListRow). */
export interface CustomerListItem extends Customer {
  vehicleCount: number;
  /** Most recent JobCard.createdAt for this customer — null if they have no job cards yet. */
  lastVisitAt: string | null;
}

/** GET /customers/summary — KPI counts for the Customers page, see CustomersService.summary(). */
export interface CustomerSummary {
  total: number;
  individual: number;
  business: number;
  cities: string[];
  totalVehicles: number;
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
/** OVERDUE is derived (dueDate passed, not yet settled), never stored — see the backend's invoice-overdue.ts. Never overrides PAID/REFUNDED. */
export type InvoiceDisplayStatus = InvoiceStatus | 'OVERDUE';

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

/** One row from GET /reports/sales-summary's `buckets` — see sales-summary.ts's computeSalesSummary(). */
export interface SalesSummaryBucket {
  period: string;
  invoiceCount: number;
  carsServiced: number;
  total: string;
  averageInvoice: string;
}

export interface SalesSummaryKpis {
  totalSales: string;
  totalInvoices: number;
  carsServiced: number;
  averageInvoiceValue: string;
}

/** GET /reports/sales-summary — powers the Reports page's Sales KPI cards, chart, and detail table (see sales-summary.ts's doc comment on why all three read from one response). */
export interface SalesSummary {
  buckets: SalesSummaryBucket[];
  kpis: SalesSummaryKpis & { highestDay: { period: string; total: string } | null };
  previousKpis: SalesSummaryKpis;
}

/** GET /reports/job-card-status — current pipeline distribution, sorted by count descending. */
export interface JobCardStatusCount {
  status: JobCardStatus;
  count: number;
}

export type VehicleFuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'cng';
export type VehicleTransmission = 'manual' | 'automatic';

/** A minimal reference to the owning customer, as embedded in vehicle responses. */
export interface CustomerRef {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
}

interface VehicleFields {
  id: string;
  registrationNo: string;
  vin: string | null;
  brand: string;
  model: string;
  variant: string | null;
  manufactureYear: number | null;
  fuelType: VehicleFuelType | null;
  transmission: VehicleTransmission | null;
  colour: string | null;
  odometerReading: number | null;
  insuranceExpiry: string | null;
  pucExpiry: string | null;
  warrantyInfo: string | null;
  purchaseDate: string | null;
  notes: string | null;
  /** Bare /uploads/... path — resolve with lib/uploads.ts's resolveUploadUrl. Null until someone uploads one; VehicleThumbnail falls back to a generic placeholder rather than treating that as an error. */
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VehicleExpiryStatus = 'active' | 'expiring_soon' | 'expired' | 'not_set';
/** Combined per-row status the Vehicles page's STATUS badge shows — see apps/api's vehicle-status.ts. */
export type VehicleStatus = 'ACTIVE' | 'EXPIRED' | 'NO_DATA';

/** GET /vehicles list item — flattened customer fields and derived status/last-service (see VehiclesService.findAll's LIST_INCLUDE/toListRow), not a nested `customer` object like VehicleDetail. */
export interface VehicleListItem extends VehicleFields {
  customerId: string;
  customerName: string;
  customerMobile: string;
  /** Most recent DELIVERED job card's actualDelivery for this vehicle — null if it has none yet. */
  lastServiceAt: string | null;
  lastServiceOdometer: number | null;
  insuranceStatus: VehicleExpiryStatus;
  pucStatus: VehicleExpiryStatus;
  status: VehicleStatus;
}

/** GET /vehicles/summary — KPI counts for the Vehicles page, see VehiclesService.summary(). */
export interface VehicleSummary {
  total: number;
  /** Includes vehicles expiring soon — insuranceExpiringSoon is the subset of this within 30 days, not a separate count. */
  insuranceActive: number;
  insuranceExpiringSoon: number;
  pucActive: number;
  pucExpiringSoon: number;
  avgAgeYears: number;
  upcomingService: number;
}

export interface VehicleDocument {
  id: string;
  docType: 'insurance' | 'rc' | 'puc' | 'warranty' | 'other';
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
}

/** GET /vehicles/:id — see VehiclesService.findOne's `include`. */
export interface VehicleDetail extends VehicleFields {
  customer: CustomerRef;
  documents: VehicleDocument[];
}

/** A minimal reference to an assigned staff member (service advisor / technician), as embedded in appointment/inspection responses. */
export interface StaffRef {
  id: string;
  name: string;
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'VEHICLE_RECEIVED'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

/** GET /appointments and GET /appointments/:id share this exact shape — see AppointmentsService's include. */
export interface Appointment {
  id: string;
  customerId: string;
  vehicleId: string;
  customer: CustomerRef;
  vehicle: { id: string; registrationNo: string; brand: string; model: string };
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceAdvisorId: string | null;
  technicianId: string | null;
  serviceAdvisor: StaffRef | null;
  technician: StaffRef | null;
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
}

/** GET /appointments/summary — KPI counts for the Appointments page, see AppointmentsService.summary(). */
export interface AppointmentSummary {
  today: number;
  /** Next 7 days, starting the day after today (today has its own count above, not double-counted here). */
  upcoming: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export type InspectionStatus = 'IN_PROGRESS' | 'COMPLETED';
/** Pending Review / Overdue are derived, never stored — see the backend's inspection-display-status.ts. */
export type InspectionDisplayStatus = InspectionStatus | 'PENDING_REVIEW' | 'OVERDUE';
export type InspectionCategory = 'EXTERIOR' | 'INTERIOR' | 'MECHANICAL' | 'ELECTRICAL' | 'UNDERBODY';
export type InspectionResult = 'PASS' | 'FAIL' | 'NEEDS_ATTENTION' | 'NOT_CHECKED';

export interface InspectionItem {
  id: string;
  category: InspectionCategory;
  itemName: string;
  result: InspectionResult;
  remarks: string | null;
}

export interface InspectionPhoto {
  id: string;
  fileUrl: string;
  fileName: string | null;
  uploadedAt: string;
}

interface InspectionFields {
  id: string;
  vehicleId: string;
  appointmentId: string | null;
  technicianId: string | null;
  status: InspectionStatus;
  notes: string | null;
  createdAt: string;
  /** Set once status first becomes COMPLETED; null while still open or if reopened. */
  completedAt: string | null;
  /** Computed fresh on every read — see computeInspectionDisplayStatus. */
  displayStatus: InspectionDisplayStatus;
  /** Minutes from createdAt to completedAt (or to now, if still open) — see computeInspectionDurationMinutes. */
  durationMinutes: number;
}

/** GET /inspections list items — includes the owning vehicle + its customer (InspectionsService's LIST_INCLUDE), not the checklist/photos. */
export interface InspectionListItem extends InspectionFields {
  vehicle: { id: string; registrationNo: string; brand: string; model: string; customer: { id: string; name: string; mobile: string } };
}

/**
 * GET /inspections/:id — includes the checklist + photos (see
 * InspectionsService's INSPECTION_INCLUDE) but still not the vehicle
 * relation; the detail page fetches that separately via GET
 * /vehicles/:id using this row's own `vehicleId`.
 */
export interface InspectionDetail extends InspectionFields {
  items: InspectionItem[];
  photos: InspectionPhoto[];
}

/** GET /inspections/summary — KPI counts for the Inspections page, see InspectionsService.summary(). */
export interface InspectionSummary {
  inProgress: number;
  pendingReview: number;
  overdue: number;
  /** This calendar month only, unlike the other three (which are live counts). */
  completedThisMonth: number;
}

export type EstimateStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
/** Display-only — 'AWAITING_APPROVAL' isn't a real EstimateStatus, it's SENT + the customer opened the approval link (see apps/api's estimate-approval-status.ts). Never persisted. */
export type EstimateApprovalStatus = EstimateStatus | 'AWAITING_APPROVAL';
export type EstimateLineItemType = 'LABOUR' | 'PART' | 'CONSUMABLE';

/** quantity/unitPrice/gstRate/lineTotal are Decimal on the backend — always strings over the wire, see this file's header note. lineTotal is always server-computed, never sent by the client. */
export interface EstimateLineItem {
  id: string;
  itemType: EstimateLineItemType;
  description: string;
  quantity: string;
  unitPrice: string;
  gstRate: string;
  lineTotal: string;
}

interface EstimateFields {
  id: string;
  estimateNumber: string | null;
  customerId: string;
  vehicleId: string;
  jobDescription: string | null;
  status: EstimateStatus;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
}

/** GET /estimates list items — enriched with customer/vehicle/linked-invoice and the derived approvalStatus (see EstimatesService.findAll's LIST_INCLUDE/toListRow). The detail page still fetches customer/vehicle separately via the row's own ids, same pattern as Inspections. */
export interface EstimateListItem extends EstimateFields {
  customerName: string;
  vehicleRegistrationNo: string;
  vehicleBrand: string;
  vehicleModel: string;
  /** Only set once this estimate was CONVERTED and its job card was invoiced — null otherwise. */
  linkedInvoiceNumber: string | null;
  approvalStatus: EstimateApprovalStatus;
}

/** GET /estimates/summary — KPI counts for the Estimates page, see EstimatesService.summary(). */
export interface EstimateSummary {
  total: number;
  draft: number;
  sent: number;
  awaitingApproval: number;
  approved: number;
  rejected: number;
  expired: number;
  converted: number;
  totalValue: string;
}

/** GET /estimates/:id — includes lineItems (see EstimatesService's `include: { lineItems: true }`) but still not customer/vehicle. */
export interface EstimateDetail extends EstimateFields {
  lineItems: EstimateLineItem[];
}

/** Minimal projection of GET /labour-items — enough for the Add Labour Line picker; the Labour catalogue itself isn't a built module yet. */
export interface LabourItemRef {
  id: string;
  code: string;
  description: string;
  standardHours: string;
  labourRate: string;
}

/** Minimal projection of GET /parts — enough for the Add Part Line picker. */
export interface PartRef {
  id: string;
  partNumber: string;
  name: string;
  sellingPrice: string;
  currentStock: number;
}

export interface PartCategory {
  id: string;
  name: string;
}

/**
 * GET /parts list items and GET /parts/:id are the exact same shape —
 * PartsService has no `include` on either (no category/supplier relation
 * joined), so there's just one Part type, unlike Vehicle/Inspection/
 * Estimate's separate ListItem/Detail split.
 */
export interface Part {
  id: string;
  partNumber: string;
  sku: string;
  name: string;
  categoryId: string | null;
  brand: string | null;
  vehicleCompatibility: string | null;
  supplierId: string | null;
  purchasePrice: string;
  sellingPrice: string;
  gstRate: string;
  hsnCode: string | null;
  currentStock: number;
  minStock: number;
  maxStock: number | null;
  binLocation: string | null;
  warrantyPeriodMonths: number | null;
  isActive: boolean;
  createdAt: string;
}

export type InventoryTxnType = 'PURCHASE_IN' | 'JOB_CARD_CONSUMPTION' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGED' | 'TRANSFER';

/** One row of GET /parts/:id/stock-ledger — append-only, quantity is signed (positive = in, negative = out). */
export interface InventoryTransactionEntry {
  id: string;
  type: InventoryTxnType;
  quantity: number;
  refType: string | null;
  refId: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

/** Derived client-side from currentStock/minStock — see lib/parts/stock-status.ts's derivePartStockStatus, which mirrors the backend's low-stock.ts exactly so the two can't disagree. */
export type PartStockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

/** GET /parts/summary — KPI values for the Parts & Inventory page, see PartsService.summary(). inventoryValue is a Decimal string (currentStock × purchasePrice, never sellingPrice). brands is the tenant-wide distinct list, for the Brand filter. */
export interface PartSummary {
  totalParts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  inventoryValue: string;
  brands: string[];
}

export const STOCK_ADJUSTMENT_REASONS = [
  'PURCHASE_RECEIVED',
  'PART_USED',
  'DAMAGED',
  'RETURNED',
  'MANUAL_CORRECTION',
  'WARRANTY_REPLACEMENT',
  'OTHER',
] as const;
export type StockAdjustmentReason = (typeof STOCK_ADJUSTMENT_REASONS)[number];

/** GET /suppliers/:id-only enrichment — real aggregates over this supplier's own purchase orders/parts, see SuppliersService.findOne(). Absent on GET /suppliers list rows. */
export interface SupplierStats {
  totalPurchaseOrders: number;
  totalPurchaseValue: string;
  outstandingPayable: string;
  partsSuppliedCount: number;
  lastPurchaseDate: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  paymentTerms: string | null;
  isActive: boolean;
  createdAt: string;
  stats?: SupplierStats;
}

/** GET /suppliers/summary — see SuppliersService.summary(). */
export interface SupplierSummary {
  total: number;
  active: number;
  inactive: number;
  totalPurchasesThisMonth: string;
  paymentTermsOptions: string[];
}

/** A minimal reference to a supplier, as embedded in purchase order responses. */
export interface SupplierRef {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

/** A minimal reference to a part, as embedded in purchase order item responses. */
export interface PartInPurchaseOrderRef {
  id: string;
  partNumber: string;
  sku: string;
  name: string;
}

export interface PurchaseOrderItem {
  id: string;
  part: PartInPurchaseOrderRef;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: string;
  gstRate: string;
  lineTotal: string;
}

export interface GoodsReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  quantityReceived: number;
}

export interface GoodsReceipt {
  id: string;
  receivedById: string | null;
  receivedAt: string;
  notes: string | null;
  items: GoodsReceiptItem[];
}

interface PurchaseOrderFields {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  expectedDeliveryDate: string | null;
  notes: string | null;
  createdAt: string;
}

/** GET /purchase-orders list item — includes supplier and a real itemCount/totalAmount (summed from the actual line items), but not the full items/goodsReceipts arrays. */
export interface PurchaseOrderListItem extends PurchaseOrderFields {
  supplier: SupplierRef;
  itemCount: number;
  totalAmount: string;
}

/** GET /purchase-orders/:id — full PURCHASE_ORDER_INCLUDE shape. */
export interface PurchaseOrderDetail extends PurchaseOrderFields {
  supplier: SupplierRef;
  items: PurchaseOrderItem[];
  goodsReceipts: GoodsReceipt[];
}

export type PurchaseOrderBucket = 'pending' | 'received' | 'cancelled';

/** GET /purchase-orders/summary — see PurchaseOrdersService.summary(). "Pending" (DRAFT+SENT) and "Received" (PARTIALLY_RECEIVED+RECEIVED) are derived buckets over the real statuses, not stored values. */
export interface PurchaseOrderSummary {
  total: number;
  pending: number;
  received: number;
  cancelled: number;
  totalOrderValue: string;
  totalReceivedValue: string;
}

export type PurchaseInvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface SupplierPayment {
  id: string;
  purchaseInvoiceId: string;
  amount: string;
  paymentDate: string;
  method: string;
  referenceNumber: string | null;
  createdAt: string;
}

/** GET /purchase-invoices list items and GET /purchase-invoices/:id both include payments (see PurchaseInvoicesService). */
export interface PurchaseInvoice {
  id: string;
  purchaseOrderId: string;
  supplierInvoiceNumber: string;
  invoiceDate: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  status: PurchaseInvoiceStatus;
  createdAt: string;
  payments: SupplierPayment[];
}

export type TechnicianStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
/** Purely derived, never stored — see the backend's technician-workload.ts. ACTIVE splits into AVAILABLE (no open job cards) / ON_JOB (at least one). */
export type TechnicianAvailability = 'AVAILABLE' | 'ON_JOB' | 'ON_LEAVE' | 'INACTIVE';

/** GET /technicians list item — see TechniciansService.findAll's include + toListRow-equivalent enrichment. */
export interface Technician {
  id: string;
  userId: string;
  employeeId: string | null;
  skills: string[];
  specialisation: string | null;
  experienceYears: number | null;
  status: TechnicianStatus;
  /** Denominator for workloadPercent — how many concurrent open job cards counts as "full" for this technician. */
  maxConcurrentJobs: number;
  workingDays: string[];
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string | null };
  /** Count of this technician's non-terminal job cards right now. */
  jobsOpen: number;
  /** Count of this technician's job cards touched (updatedAt) today. */
  todayCount: number;
  workloadPercent: number;
  availability: TechnicianAvailability;
}

/** GET /technicians/:id (and /me) — base profile plus computed workload (see computeTechnicianPerformance, all derived on read, never stored). */
export interface TechnicianDetail extends Technician {
  jobsCompleted: number;
  totalLabourHours: string;
  revenueGenerated: string;
  completedToday: number;
  hoursToday: string;
  /** Mean days from createdAt to actualDelivery across lifetime DELIVERED job cards — null when there are none yet, never a fabricated 0. */
  avgCompletionDays: number | null;
}

/** GET /technicians/summary — KPI counts for the Technicians page, see TechniciansService.summary(). */
export interface TechnicianSummary {
  active: number;
  available: number;
  onJob: number;
  onLeave: number;
  inactive: number;
}

/** hours/rate/gstRate/lineTotal are Decimal on the backend — strings over the wire. No update endpoint exists for a line once added — only add (POST) and remove (DELETE); hsnSac is a GST snapshot, not displayed. */
export interface JobCardLabourLine {
  id: string;
  labourItemId: string | null;
  description: string | null;
  hours: string;
  rate: string;
  gstRate: string;
  lineTotal: string;
  /** Snapshotted from LabourItem.warrantyPeriodMonths at add-time — null means no warranty on this line. */
  warrantyMonths: number | null;
  /** Set when this line is the fix for an open warranty claim raised on THIS job card — see CreateJobCardLabourDto.warrantyClaimId. */
  warrantyClaimId: string | null;
}

/** quantity is Int; unitPrice/gstRate/lineTotal are Decimal → strings. Same add/remove-only discipline as JobCardLabourLine — removing restores stock (see VehiclesService.removePart). */
export interface JobCardPartLine {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: string;
  gstRate: string;
  lineTotal: string;
  /** Snapshotted from Part.warrantyPeriodMonths/warrantyKm at add-time — whichever comes first. */
  warrantyMonths: number | null;
  warrantyKm: number | null;
  /** Set when this line is the fix for an open warranty claim raised on THIS job card. */
  warrantyClaimId: string | null;
}

/** One row of GET /vehicles/:id/warranty-status's `labour` array — computed fresh on every read, never stored. */
export interface VehicleWarrantyLabourLine {
  jobCardLabourId: string;
  jobCardId: string;
  jobCardNumber: string;
  description: string;
  warrantyMonths: number | null;
  expiresAt: string | null;
  isActive: boolean;
  /** An existing WarrantyClaim already raised against this line, if any — set to disable "Raise Claim" a second time (or show it as a link) rather than block silently. */
  existingClaimId: string | null;
}

/** One row of GET /vehicles/:id/warranty-status's `parts` array. */
export interface VehicleWarrantyPartLine {
  jobCardPartId: string;
  jobCardId: string;
  jobCardNumber: string;
  partName: string;
  warrantyMonths: number | null;
  warrantyKm: number | null;
  expiresAt: string | null;
  expiredByKm: boolean;
  isActive: boolean;
  existingClaimId: string | null;
}

export interface VehicleWarrantyStatus {
  labour: VehicleWarrantyLabourLine[];
  parts: VehicleWarrantyPartLine[];
}

export type WarrantyClaimStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'RESOLVED';

/** GET /warranty-claims(/:id) — links a NEW comeback job card back to the original line it's claiming against. Exactly one of originalJobCardPart/originalJobCardLabour is set. */
export interface WarrantyClaim {
  id: string;
  claimJobCardId: string;
  claimJobCard: { id: string; jobCardNumber: string; vehicleId: string; customerId: string };
  originalJobCardPartId: string | null;
  originalJobCardPart: {
    id: string;
    part: { id: string; partNumber: string; name: string };
    jobCard: { id: string; jobCardNumber: string; actualDelivery: string | null; odometer: number | null };
  } | null;
  originalJobCardLabourId: string | null;
  originalJobCardLabour: {
    id: string;
    description: string | null;
    labourItem: { id: string; code: string; description: string } | null;
    jobCard: { id: string; jobCardNumber: string; actualDelivery: string | null; odometer: number | null };
  } | null;
  status: WarrantyClaimStatus;
  isBillable: boolean;
  resolutionNotes: string | null;
  approvedByUserId: string | null;
  approvedByUser: { id: string; name: string } | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobCardStatusHistoryEntry {
  id: string;
  fromStatus: JobCardStatus | null;
  toStatus: JobCardStatus;
  changedByUserId: string | null;
  changedAt: string;
  notes: string | null;
}

/** Append-only — no edit/delete endpoint exists, matching the schema's own "never edited or removed" comment on JobCardNote. */
export interface JobCardNoteEntry {
  id: string;
  authorId: string;
  note: string;
  createdAt: string;
}

interface JobCardFields {
  id: string;
  jobCardNumber: string;
  vehicleId: string;
  customerId: string;
  vehicle: { id: string; registrationNo: string; brand: string; model: string; photoUrl: string | null };
  customer: CustomerRef;
  estimateId: string | null;
  inspectionId: string | null;
  technicianId: string | null;
  serviceAdvisorId: string | null;
  odometer: number | null;
  complaint: string | null;
  customerRequest: string | null;
  estimatedWork: string | null;
  status: JobCardStatus;
  priority: JobCardPriority;
  startAt: string | null;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  createdAt: string;
}

/**
 * GET /job-cards list item — includes vehicle/customer plus technician/
 * serviceAdvisor and derived fields flattened from real line-item/stock
 * data (see JobCardsService.toListRow): `estimatedTotal` is the sum of
 * this job card's labour + parts lineTotals (a real snapshot sum, not an
 * estimate-record total), `estimatedHours` sums labourItems.hours,
 * `partsPending`/`partsTotal` count JobCardPart lines whose part is
 * currently at-or-below its reorder point vs. total lines added,
 * `progressPercent` is pipeline-position-based (null for CANCELLED), and
 * `delayStatus`/`delayDays` derive from expectedDelivery vs. now (both
 * null when not applicable). Raw labourItems/parts arrays are NOT
 * included here — see JOB_CARD_INCLUDE for the full detail-page shape.
 */
export interface JobCardListItem extends JobCardFields {
  technician: StaffRef | null;
  serviceAdvisor: StaffRef | null;
  estimatedTotal: string;
  estimatedHours: number;
  partsPending: number;
  partsTotal: number;
  progressPercent: number | null;
  delayStatus: JobCardDelayStatus | null;
  delayDays: number | null;
}

/** GET /job-cards/summary — KPI counts for the Job Cards board, see JobCardsService.summary(). */
export interface JobCardSummary {
  open: number;
  diagnosis: number;
  waitingApproval: number;
  inProgress: number;
  waitingParts: number;
  readyForDelivery: number;
  /** This calendar month only (via actualDelivery), unlike the other counts which are live. */
  deliveredThisMonth: number;
  cancelled: number;
}

/** GET /job-cards/:id — full JOB_CARD_INCLUDE shape. */
export interface JobCardDetail extends JobCardFields {
  labourItems: JobCardLabourLine[];
  parts: JobCardPartLine[];
  statusHistory: JobCardStatusHistoryEntry[];
  notes: JobCardNoteEntry[];
  /** null until POST /job-cards/:id/generate-invoice has been called once — Invoice.jobCardId is unique, so at most one. */
  invoice: { id: string; invoiceNumber: string; status: InvoiceStatus; grandTotal: string } | null;
}

// 'razorpay' is never staff-selectable (not in CreateInvoicePaymentDto's
// allowed values) — it only ever appears on a Payment the gateway webhook
// created itself, never one entered through the manual "Record Payment" form.
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit' | 'razorpay';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber: string | null;
  createdAt: string;
}

/** hsnSac is the final GST snapshot from JobCardPart/JobCardLabour (see the backend's Phase 7 HSN/SAC gap-fix) — printed per line item. */
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  gstRate: string;
  hsnSac: string | null;
  lineTotal: string;
}

/** The job card an invoice is for, enriched with the one relation hop needed to reach Vehicle/Service Advisor/Technician — Invoice itself has no direct vehicleId. */
export interface InvoiceJobCardRef {
  id: string;
  jobCardNumber: string;
  createdAt: string;
  vehicle: { id: string; registrationNo: string; brand: string; model: string; vin: string | null };
  serviceAdvisor: { id: string; name: string } | null;
  technician: { id: string; user: { name: string } } | null;
}

interface InvoiceFields {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: CustomerRef & { state: string | null };
  jobCardId: string | null;
  jobCard: InvoiceJobCardRef | null;
  subtotal: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  roundOff: string;
  grandTotal: string;
  loyaltyDiscountAmount: string;
  status: InvoiceStatus;
  dueDate: string | null;
  createdAt: string;
  /** Sum of this invoice's own payments — real, computed server-side, never recomputed client-side. */
  paidAmount: string;
  /** grandTotal minus paidAmount — the true outstanding balance. */
  dueAmount: string;
  displayStatus: InvoiceDisplayStatus;
  /** Whole calendar days past due — null unless displayStatus is OVERDUE. */
  overdueDays: number | null;
}

/** GET /invoices list item — includes customer + jobCard (with vehicle/advisor/technician) but not lineItems/payments. */
export type InvoiceListItem = InvoiceFields;

/** GET /invoices/:id — full INVOICE_INCLUDE shape. No direct create/update/delete exists — invoices are only ever generated from a job card and paid down via payments. */
export interface InvoiceDetail extends InvoiceFields {
  lineItems: InvoiceLineItem[];
  payments: Payment[];
}

/** GET /invoices/summary — KPI/aging/leaderboard data for the Invoices page, see InvoicesService.summary(). */
export interface InvoiceSummary {
  totalInvoicesThisMonth: number;
  paid: { count: number; amount: string };
  unpaid: { count: number; amount: string };
  overdue: { count: number; amount: string };
  totalRevenueThisMonth: string;
  aging: { d0to30: string; d31to60: string; d60plus: string };
  recentlyPaid: { id: string; invoiceId: string; invoiceNumber: string; customerName: string; amount: string; paymentDate: string }[];
  overdueList: { id: string; invoiceNumber: string; customerName: string; dueAmount: string; overdueDays: number }[];
  topPayingCustomers: { name: string; amount: string }[];
}

/**
 * GET/PATCH /users/me and GET/POST/PATCH /users(/:id) all share this exact
 * shape (the backend's SAFE_SELECT) — the admin-facing User type and the
 * self-profile type are the same thing, just reached via different
 * routes/permissions. On GET/PATCH /users/me, email/roles/isActive are
 * read-only (see UpdateOwnProfileDto) — only name/phone are self-editable;
 * an admin using PATCH /users/:id (user:update) can change more.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Resolved display URL (local path or signed S3 URL) — resolve with lib/uploads.ts's resolveUploadUrl before use in an <img src>, same as Vehicle.photoUrl. Null falls back to an initials avatar. */
  avatarUrl: string | null;
  isActive: boolean;
  branchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  roles: Array<{ role: { id: string; name: string } }>;
}

export type AppUser = UserProfile;

export interface Permission {
  id: string;
  resource: string;
  action: string;
}

/** GET /roles / GET /roles/:id — see ROLE_SELECT. System roles (isSystem) can't be edited (backend throws ForbiddenException on PATCH). */
export interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: Array<{ permission: Permission }>;
}

/** One row of GET /audit-logs — see AuditLogsService, built to close the "audit trail is write-only" SRS gap. */
export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

/** GET /search?q=... — each category is independently permission-gated server-side (see SearchService), so two users can get different result shapes for the same query. */
export interface SearchResults {
  customers: Array<{ id: string; name: string; mobile: string }>;
  vehicles: Array<{ id: string; registrationNo: string; brand: string; model: string }>;
  jobCards: Array<{ id: string; jobCardNumber: string; status: JobCardStatus }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: InvoiceStatus; grandTotal: string }>;
  parts: Array<{ id: string; partNumber: string; sku: string; name: string }>;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';

/** One row per (user, calendar day) — GET /attendance (admin) includes user/markedBy; GET /attendance/me (self) doesn't need them. */
export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
  markedBy?: { id: string; name: string } | null;
}

/** A single {labourItem}/{part}/{partCategory} join row from GET /service-packages(/:id) — only the nested ref is ever rendered, the join row's own id isn't used. */
export interface ServicePackageLabourItemRef {
  labourItem: { id: string; code: string; description: string };
}
export interface ServicePackagePartRef {
  part: { id: string; partNumber: string; name: string };
}
export interface ServicePackagePartCategoryRef {
  partCategory: { id: string; name: string };
}

/** GET /service-packages(/:id) — the sellable template, not a specific sale (see CustomerServicePackage for that). Included-items arrays define what redeeming this package covers for free on a job card. */
/** GET /service-packages/:id-only enrichment — see ServicePackagesService.findOne(). Absent on GET /service-packages list rows. */
export interface ServicePackageStats {
  soldCount: number;
  activeSoldCount: number;
  totalRevenue: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  price: string;
  gstRate: string;
  validityMonths: number;
  visitLimit: number | null;
  isActive: boolean;
  createdAt: string;
  includedLabourItems: ServicePackageLabourItemRef[];
  includedParts: ServicePackagePartRef[];
  includedPartCategories: ServicePackagePartCategoryRef[];
  stats?: ServicePackageStats;
}

/** GET /service-packages/summary — see ServicePackagesService.summary(). */
export interface ServicePackageSummary {
  total: number;
  active: number;
  inactive: number;
  avgPrice: string;
  validityOptions: number[];
  visitLimitOptions: number[];
  mostPopular: { id: string; name: string; soldCount: number } | null;
}

export type CustomerPackageStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

/** GET /customer-service-packages(/:id) — one specific sale of a ServicePackage template to a customer+vehicle. visitLimit here is SNAPSHOTTED at sale time — a later edit to the template doesn't change it. */
export interface CustomerServicePackage {
  id: string;
  servicePackageId: string;
  servicePackage: { id: string; name: string; price: string; gstRate: string; validityMonths: number };
  customerId: string;
  customer: CustomerRef;
  vehicleId: string;
  vehicle: { id: string; registrationNo: string; brand: string; model: string };
  purchaseInvoiceId: string;
  purchaseInvoice: { id: string; invoiceNumber: string; grandTotal: string; status: InvoiceStatus };
  startDate: string;
  endDate: string;
  visitLimit: number | null;
  visitsUsed: number;
  status: CustomerPackageStatus;
  renewedFromId: string | null;
  createdAt: string;
}

/** GET /loyalty/customers/:customerId/balance */
export interface LoyaltyBalance {
  customerId: string;
  customerName: string;
  balance: number;
}

export type LoyaltyTransactionType = 'EARNED' | 'REDEEMED' | 'ADJUSTED';

/** One row of GET /loyalty/transactions — append-only ledger; `balanceAfter` is the running balance snapshot right after this entry, so history never needs re-summing. */
export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  customer: { id: string; name: string };
  invoiceId: string | null;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  note: string | null;
  adjustedByUserId: string | null;
  adjustedByUser: { id: string; name: string } | null;
  createdAt: string;
}

export type GstExportSide = 'sales' | 'purchases';
export type GstExportFormat = 'tally-xml' | 'gstr-csv';

/** One entry of a GET /reports/export/gst preview's `amended` array — a voucher whose amount changed since the last export covering an overlapping period (see export-manifest-diff.ts). */
export interface GstExportAmendedEntry {
  sourceId: string;
  referenceNumber: string;
  previousAmount: string;
  currentAmount: string;
}

/** `?preview=true`, side=sales response — same totals shape as GET /reports/gst-summary, by construction (both share summarizeInvoiceGst on the backend). */
export interface GstExportSalesPreview {
  warnings: string[];
  amended: GstExportAmendedEntry[];
  supersedesBatchNumber: string | null;
  invoiceCount: number;
  gstTotals: {
    invoiceCount: number;
    subtotal: string;
    cgstAmount: string;
    sgstAmount: string;
    igstAmount: string;
    totalGst: string;
    grandTotal: string;
  };
}

/** `?preview=true`, side=purchases response — itcTotals is aggregate-only, see the export's own `warnings` for the approximation this carries. */
export interface GstExportPurchasesPreview {
  warnings: string[];
  amended: GstExportAmendedEntry[];
  supersedesBatchNumber: string | null;
  invoiceCount: number;
  itcTotals: {
    invoiceCount: number;
    taxableValue: string;
    taxAmount: string;
    total: string;
  };
}
