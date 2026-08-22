"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const generate_sequence_number_1 = require("../../common/sequence/generate-sequence-number");
const reports_service_1 = require("../reports/reports.service");
const gst_summary_1 = require("../reports/gst-summary");
const csv_1 = require("./csv");
const gstr1_rows_1 = require("./gstr1-rows");
const tally_xml_1 = require("./tally-xml");
const tally_vouchers_1 = require("./tally-vouchers");
const purchase_register_1 = require("./purchase-register");
const export_manifest_diff_1 = require("./export-manifest-diff");
let ExportService = class ExportService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async exportGst(query, userId) {
        if (new Date(query.from) > new Date(query.to)) {
            throw new common_1.BadRequestException('"from" must be on or before "to"');
        }
        const isPreview = query.preview === 'true';
        return query.side === 'sales' ? this.exportSales(query, userId, isPreview) : this.exportPurchases(query, userId, isPreview);
    }
    async exportSales(query, userId, isPreview) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const [tenant, tenantSettings, invoices] = await Promise.all([
            this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
            db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
            db.invoice.findMany({
                where: (0, reports_service_1.dateRangeWhere)('createdAt', query.from, query.to),
                include: { lineItems: true, customer: { select: { name: true, gstin: true, state: true } }, payments: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        const gstTotals = (0, gst_summary_1.summarizeInvoiceGst)(invoices);
        const gstrInvoices = invoices.map((inv) => ({
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.createdAt,
            grandTotal: inv.grandTotal,
            customerGstin: inv.customer.gstin,
            customerState: inv.customer.state,
            lineItems: inv.lineItems.map((li) => ({ hsnSac: li.hsnSac, gstRate: li.gstRate, lineTotal: li.lineTotal, quantity: li.quantity })),
        }));
        const warnings = [];
        const missingHsnCount = (0, gstr1_rows_1.countMissingHsn)(gstrInvoices);
        if (missingHsnCount > 0) {
            warnings.push(`${missingHsnCount} invoice line item(s) have no HSN/SAC code set — grouped under "UNSPECIFIED" in the HSN summary. Add codes on the relevant Parts/Labour Items so future exports are complete.`);
        }
        const manifestEntries = invoices.map((inv) => ({
            type: 'invoice',
            sourceId: inv.id,
            referenceNumber: inv.invoiceNumber,
            amount: inv.grandTotal.toString(),
        }));
        if (isPreview) {
            const { amended, supersedesBatchNumber } = await this.previewAmendments(db, 'sales', query.from, query.to, manifestEntries);
            return {
                batchNumber: null,
                filename: '',
                contentType: 'application/json',
                content: JSON.stringify({ gstTotals, invoiceCount: invoices.length }),
                warnings,
                amended,
                supersedesBatchNumber,
            };
        }
        let content;
        let contentType;
        let filename;
        if (query.format === 'gstr-csv') {
            const b2b = (0, gstr1_rows_1.buildB2bRows)(gstrInvoices, tenantSettings.state);
            const b2c = (0, gstr1_rows_1.buildB2cSummaryRows)(gstrInvoices, tenantSettings.state);
            const hsn = (0, gstr1_rows_1.buildHsnSummaryRows)(gstrInvoices, tenantSettings.state);
            content = [
                (0, csv_1.toCsv)([['B2B INVOICES'], ['GSTIN', 'Invoice No', 'Invoice Date', 'Invoice Value', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST']]),
                (0, csv_1.toCsv)(b2b.map((r) => [r.gstin, r.invoiceNumber, r.invoiceDate, r.invoiceValue.toFixed(2), r.rate, r.taxableValue.toFixed(2), r.igstAmount.toFixed(2), r.cgstAmount.toFixed(2), r.sgstAmount.toFixed(2)])),
                '',
                (0, csv_1.toCsv)([['B2C SUMMARY'], ['Place of Supply', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST']]),
                (0, csv_1.toCsv)(b2c.map((r) => [r.placeOfSupply, r.rate, r.taxableValue.toFixed(2), r.igstAmount.toFixed(2), r.cgstAmount.toFixed(2), r.sgstAmount.toFixed(2)])),
                '',
                (0, csv_1.toCsv)([['HSN/SAC SUMMARY'], ['HSN/SAC', 'Rate', 'Total Quantity', 'Taxable Value', 'IGST', 'CGST', 'SGST']]),
                (0, csv_1.toCsv)(hsn.map((r) => [r.hsnSac, r.rate, r.totalQuantity.toString(), r.taxableValue.toFixed(2), r.igstAmount.toFixed(2), r.cgstAmount.toFixed(2), r.sgstAmount.toFixed(2)])),
            ].join('\n');
            contentType = 'text/csv';
            filename = `gstr1-sales-${query.from}_to_${query.to}.csv`;
        }
        else {
            const salesVouchers = invoices.map((inv) => (0, tally_vouchers_1.buildSalesVoucher)({
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.createdAt,
                customerName: inv.customer.name,
                subtotal: inv.subtotal,
                cgstAmount: inv.cgstAmount,
                sgstAmount: inv.sgstAmount,
                igstAmount: inv.igstAmount,
                roundOff: inv.roundOff,
                grandTotal: inv.grandTotal,
            }));
            const receiptVouchers = invoices.flatMap((inv) => inv.payments.map((p) => (0, tally_vouchers_1.buildReceiptVoucher)({
                reference: p.referenceNumber ?? p.id,
                paymentDate: p.paymentDate,
                customerName: inv.customer.name,
                amount: p.amount,
                method: p.method,
            })));
            const { xml, skipped } = (0, tally_xml_1.buildTallyVoucherXml)([...salesVouchers, ...receiptVouchers], tenant?.name ?? 'AutoNexa Workshop');
            if (skipped.length > 0) {
                warnings.push(`${skipped.length} voucher(s) excluded from the XML — their ledger entries didn't balance. This should not happen; investigate before importing.`);
            }
            content = xml;
            contentType = 'application/xml';
            filename = `tally-sales-${query.from}_to_${query.to}.xml`;
        }
        const { batchNumber, amended, supersedesBatchNumber } = await this.resolveBatch(db, tenantId, 'sales', query.format, query.from, query.to, userId, manifestEntries);
        if (amended.length > 0) {
            warnings.push(`${amended.length} invoice(s) changed since batch ${supersedesBatchNumber} — flagged below.`);
        }
        return { batchNumber, filename, contentType, content, warnings, amended, supersedesBatchNumber };
    }
    async exportPurchases(query, userId, isPreview) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const [tenant, purchaseInvoices] = await Promise.all([
            this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
            db.purchaseInvoice.findMany({
                where: (0, reports_service_1.dateRangeWhere)('invoiceDate', query.from, query.to),
                include: { purchaseOrder: { include: { supplier: { select: { name: true, gstin: true } } } }, payments: true },
                orderBy: { invoiceDate: 'asc' },
            }),
        ]);
        const registerLines = purchaseInvoices.map((pi) => ({
            supplierName: pi.purchaseOrder.supplier.name,
            supplierGstin: pi.purchaseOrder.supplier.gstin,
            supplierInvoiceNumber: pi.supplierInvoiceNumber,
            invoiceDate: pi.invoiceDate,
            subtotal: pi.subtotal,
            taxAmount: pi.taxAmount,
            total: pi.total,
        }));
        const itcTotals = (0, purchase_register_1.summarizePurchaseItc)(registerLines);
        const warnings = [
            'Purchase-side figures are approximate: PurchaseInvoice has no HSN-wise or CGST/SGST/IGST breakdown, so tax is shown as one blended amount, split evenly into CGST+SGST assuming an in-state supplier. Correct for GSTR-3B\'s aggregate ITC total; not accurate per-tax-head for an inter-state supplier.',
        ];
        const missingGstinCount = (0, purchase_register_1.countMissingSupplierGstin)(registerLines);
        if (missingGstinCount > 0) {
            warnings.push(`${missingGstinCount} purchase invoice(s) have a supplier with no GSTIN on file — shown as UNREGISTERED.`);
        }
        const manifestEntries = purchaseInvoices.map((pi) => ({
            type: 'purchaseInvoice',
            sourceId: pi.id,
            referenceNumber: pi.supplierInvoiceNumber,
            amount: pi.total.toString(),
        }));
        if (isPreview) {
            const { amended, supersedesBatchNumber } = await this.previewAmendments(db, 'purchases', query.from, query.to, manifestEntries);
            if (amended.length > 0) {
                warnings.push(`${amended.length} purchase invoice(s) changed since batch ${supersedesBatchNumber} — flagged below. If already imported into Tally, correct those vouchers manually rather than re-importing.`);
            }
            return {
                batchNumber: null,
                filename: '',
                contentType: 'application/json',
                content: JSON.stringify({ itcTotals, invoiceCount: purchaseInvoices.length }),
                warnings,
                amended,
                supersedesBatchNumber,
            };
        }
        let content;
        let contentType;
        let filename;
        if (query.format === 'gstr-csv') {
            const rows = (0, purchase_register_1.buildPurchaseRegisterRows)(registerLines);
            content = [
                (0, csv_1.toCsv)([['PURCHASE REGISTER (approximate — see warnings)'], ['Supplier', 'Supplier GSTIN', 'Supplier Invoice No', 'Invoice Date', 'Taxable Value', 'Tax Amount', 'Total']]),
                (0, csv_1.toCsv)(rows.map((r) => [r.supplierName, r.supplierGstin, r.supplierInvoiceNumber, r.invoiceDate, r.taxableValue.toFixed(2), r.taxAmount.toFixed(2), r.total.toFixed(2)])),
                '',
                (0, csv_1.toCsv)([['GSTR-3B ITC SUMMARY (Table 4A aggregate)'], ['Invoice Count', 'Taxable Value', 'Tax Amount (ITC available)', 'Total']]),
                (0, csv_1.toCsv)([[itcTotals.invoiceCount, itcTotals.taxableValue.toFixed(2), itcTotals.taxAmount.toFixed(2), itcTotals.total.toFixed(2)]]),
            ].join('\n');
            contentType = 'text/csv';
            filename = `gstr3b-purchases-${query.from}_to_${query.to}.csv`;
        }
        else {
            const purchaseVouchers = purchaseInvoices.map((pi) => (0, tally_vouchers_1.buildPurchaseVoucher)({
                supplierInvoiceNumber: pi.supplierInvoiceNumber,
                invoiceDate: pi.invoiceDate,
                supplierName: pi.purchaseOrder.supplier.name,
                subtotal: pi.subtotal,
                taxAmount: pi.taxAmount,
                total: pi.total,
            }));
            const paymentVouchers = purchaseInvoices.flatMap((pi) => pi.payments.map((p) => (0, tally_vouchers_1.buildPaymentVoucher)({
                reference: p.referenceNumber ?? p.id,
                paymentDate: p.paymentDate,
                supplierName: pi.purchaseOrder.supplier.name,
                amount: p.amount,
                method: p.method,
            })));
            const { xml, skipped } = (0, tally_xml_1.buildTallyVoucherXml)([...purchaseVouchers, ...paymentVouchers], tenant?.name ?? 'AutoNexa Workshop');
            if (skipped.length > 0) {
                warnings.push(`${skipped.length} voucher(s) excluded from the XML — their ledger entries didn't balance. This should not happen; investigate before importing.`);
            }
            content = xml;
            contentType = 'application/xml';
            filename = `tally-purchases-${query.from}_to_${query.to}.xml`;
        }
        const { batchNumber, amended, supersedesBatchNumber } = await this.resolveBatch(db, tenantId, 'purchases', query.format, query.from, query.to, userId, manifestEntries);
        if (amended.length > 0) {
            warnings.push(`${amended.length} purchase invoice(s) changed since batch ${supersedesBatchNumber} — flagged below. If already imported into Tally, correct those vouchers manually rather than re-importing.`);
        }
        return { batchNumber, filename, contentType, content, warnings, amended, supersedesBatchNumber };
    }
    async previewAmendments(db, side, from, to, currentManifest) {
        const latestOverlapping = await db.gstExportBatch.findFirst({
            where: { side, periodFrom: { lte: new Date(to) }, periodTo: { gte: new Date(from) } },
            orderBy: { generatedAt: 'desc' },
            select: { batchNumber: true, manifest: true },
        });
        if (!latestOverlapping)
            return { amended: [], supersedesBatchNumber: null };
        return {
            amended: (0, export_manifest_diff_1.diffManifest)(latestOverlapping.manifest, currentManifest),
            supersedesBatchNumber: latestOverlapping.batchNumber,
        };
    }
    async resolveBatch(db, tenantId, side, format, from, to, userId, manifest) {
        const exactPrior = await db.gstExportBatch.findFirst({
            where: { side, periodFrom: new Date(from), periodTo: new Date(to) },
            orderBy: { generatedAt: 'desc' },
            select: { batchNumber: true, manifest: true },
        });
        if (exactPrior && (0, export_manifest_diff_1.manifestsAreEqual)(exactPrior.manifest, manifest)) {
            return { batchNumber: exactPrior.batchNumber, amended: [], supersedesBatchNumber: null };
        }
        const latestOverlapping = await db.gstExportBatch.findFirst({
            where: { side, periodFrom: { lte: new Date(to) }, periodTo: { gte: new Date(from) } },
            orderBy: { generatedAt: 'desc' },
            select: { batchNumber: true, manifest: true },
        });
        const amended = latestOverlapping ? (0, export_manifest_diff_1.diffManifest)(latestOverlapping.manifest, manifest) : [];
        const batchNumber = await db.$transaction(async (tx) => {
            const num = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, tenantId, 'GST_EXPORT', 'GSTEXP');
            await tx.gstExportBatch.create({
                data: {
                    batchNumber: num,
                    side,
                    format,
                    periodFrom: new Date(from),
                    periodTo: new Date(to),
                    generatedByUserId: userId,
                    manifest: manifest,
                },
            });
            return num;
        });
        return { batchNumber, amended, supersedesBatchNumber: latestOverlapping?.batchNumber ?? null };
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExportService);
//# sourceMappingURL=export.service.js.map