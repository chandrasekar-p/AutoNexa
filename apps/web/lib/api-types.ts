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
  createdAt: string;
  updatedAt: string;
}

/** GET /vehicles list item — see VehiclesService.findAll's `include`. */
export interface VehicleListItem extends VehicleFields {
  customer: CustomerRef;
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
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
}

export type InspectionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type InspectionCategory = 'EXTERIOR' | 'INTERIOR' | 'MECHANICAL';
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
}

/**
 * GET /inspections list items — no `items`/`photos` (InspectionsService's
 * findAll has no `include` at all), and no vehicle relation either — the
 * list page shows what's available and links through to the detail page
 * for the rest.
 */
export type InspectionListItem = InspectionFields;

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

export type EstimateStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
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

/** GET /estimates list items — no lineItems and no customer/vehicle relations (EstimatesService.findAll has no `include` at all); the detail page fetches customer/vehicle separately via the row's own ids, same pattern as Inspections. */
export type EstimateListItem = EstimateFields;

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

/** GET /purchase-orders list item — includes supplier but not items/goodsReceipts. */
export interface PurchaseOrderListItem extends PurchaseOrderFields {
  supplier: SupplierRef;
}

/** GET /purchase-orders/:id — full PURCHASE_ORDER_INCLUDE shape. */
export interface PurchaseOrderDetail extends PurchaseOrderFields {
  supplier: SupplierRef;
  items: PurchaseOrderItem[];
  goodsReceipts: GoodsReceipt[];
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

/** GET /technicians list item — see TechniciansService.findAll's include. */
export interface Technician {
  id: string;
  userId: string;
  employeeId: string | null;
  skills: string[];
  specialisation: string | null;
  experienceYears: number | null;
  status: TechnicianStatus;
  createdAt: string;
  user: { id: string; name: string; email: string; phone: string | null };
}

/** GET /technicians/:id — base profile plus computed workload (see computeTechnicianPerformance, all derived on read, never stored). */
export interface TechnicianDetail extends Technician {
  jobsOpen: number;
  jobsCompleted: number;
  totalLabourHours: string;
  revenueGenerated: string;
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
}

/** quantity is Int; unitPrice/gstRate/lineTotal are Decimal → strings. Same add/remove-only discipline as JobCardLabourLine — removing restores stock (see VehiclesService.removePart). */
export interface JobCardPartLine {
  id: string;
  partId: string;
  quantity: number;
  unitPrice: string;
  gstRate: string;
  lineTotal: string;
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
  vehicle: { id: string; registrationNo: string; brand: string; model: string };
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
  startAt: string | null;
  expectedDelivery: string | null;
  actualDelivery: string | null;
  createdAt: string;
}

/** GET /job-cards list item — includes vehicle/customer (unlike Inspections/Estimates), but not labourItems/parts/statusHistory/notes — see JobCardsService.findAll's narrower include vs. JOB_CARD_INCLUDE. */
export type JobCardListItem = JobCardFields;

/** GET /job-cards/:id — full JOB_CARD_INCLUDE shape. */
export interface JobCardDetail extends JobCardFields {
  labourItems: JobCardLabourLine[];
  parts: JobCardPartLine[];
  statusHistory: JobCardStatusHistoryEntry[];
  notes: JobCardNoteEntry[];
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'credit';

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

interface InvoiceFields {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: CustomerRef & { state: string | null };
  jobCardId: string | null;
  subtotal: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  roundOff: string;
  grandTotal: string;
  status: InvoiceStatus;
  createdAt: string;
}

/** GET /invoices list item — includes customer but not lineItems/payments/jobCard. */
export type InvoiceListItem = InvoiceFields;

/** GET /invoices/:id — full INVOICE_INCLUDE shape (customer, jobCard summary, lineItems, payments). No direct create/update/delete exists — invoices are only ever generated from a job card and paid down via payments. */
export interface InvoiceDetail extends InvoiceFields {
  jobCard: { id: string; jobCardNumber: string } | null;
  lineItems: InvoiceLineItem[];
  payments: Payment[];
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
