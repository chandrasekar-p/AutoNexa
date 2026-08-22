import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { dateRangeWhere } from '../reports/reports.service';
import { summarizeInvoiceGst } from '../reports/gst-summary';
import { ExportGstQueryDto } from './dto/export-gst-query.dto';
import { toCsv } from './csv';
import { buildB2bRows, buildB2cSummaryRows, buildHsnSummaryRows, countMissingHsn, GstrInvoiceInput } from './gstr1-rows';
import { buildTallyVoucherXml, TallyVoucherInput } from './tally-xml';
import { buildSalesVoucher, buildReceiptVoucher, buildPurchaseVoucher, buildPaymentVoucher } from './tally-vouchers';
import { buildPurchaseRegisterRows, summarizePurchaseItc, countMissingSupplierGstin, PurchaseRegisterLineInput } from './purchase-register';
import { diffManifest, manifestsAreEqual, ManifestEntry, AmendedEntry } from './export-manifest-diff';

export interface GstExportResult {
  batchNumber: string | null;
  filename: string;
  contentType: string;
  content: string;
  warnings: string[];
  amended: AmendedEntry[];
  supersedesBatchNumber: string | null;
}

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportGst(query: ExportGstQueryDto, userId: string): Promise<GstExportResult> {
    if (new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('"from" must be on or before "to"');
    }
    const isPreview = query.preview === 'true';

    return query.side === 'sales' ? this.exportSales(query, userId, isPreview) : this.exportPurchases(query, userId, isPreview);
  }

  private async exportSales(query: ExportGstQueryDto, userId: string, isPreview: boolean): Promise<GstExportResult> {
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();

    const [tenant, tenantSettings, invoices] = await Promise.all([
      this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
      db.invoice.findMany({
        where: dateRangeWhere('createdAt', query.from, query.to),
        include: { lineItems: true, customer: { select: { name: true, gstin: true, state: true } }, payments: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Same rows, same reduction reports.service.ts's gstSummary() uses for
    // this period — guarantees this export can never disagree with that report.
    const gstTotals = summarizeInvoiceGst(invoices);

    const gstrInvoices: GstrInvoiceInput[] = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.createdAt,
      grandTotal: inv.grandTotal,
      customerGstin: inv.customer.gstin,
      customerState: inv.customer.state,
      lineItems: inv.lineItems.map((li) => ({ hsnSac: li.hsnSac, gstRate: li.gstRate, lineTotal: li.lineTotal, quantity: li.quantity })),
    }));

    const warnings: string[] = [];
    const missingHsnCount = countMissingHsn(gstrInvoices);
    if (missingHsnCount > 0) {
      warnings.push(
        `${missingHsnCount} invoice line item(s) have no HSN/SAC code set — grouped under "UNSPECIFIED" in the HSN summary. Add codes on the relevant Parts/Labour Items so future exports are complete.`,
      );
    }

    const manifestEntries: ManifestEntry[] = invoices.map((inv) => ({
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

    let content: string;
    let contentType: string;
    let filename: string;

    if (query.format === 'gstr-csv') {
      const b2b = buildB2bRows(gstrInvoices, tenantSettings.state);
      const b2c = buildB2cSummaryRows(gstrInvoices, tenantSettings.state);
      const hsn = buildHsnSummaryRows(gstrInvoices, tenantSettings.state);

      content = [
        toCsv([['B2B INVOICES'], ['GSTIN', 'Invoice No', 'Invoice Date', 'Invoice Value', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST']]),
        toCsv(b2b.map((r) => [r.gstin, r.invoiceNumber, r.invoiceDate, r.invoiceValue.toFixed(2), r.rate, r.taxableValue.toFixed(2), r.igstAmount.toFixed(2), r.cgstAmount.toFixed(2), r.sgstAmount.toFixed(2)])),
        '',
        toCsv([['B2C SUMMARY'], ['Place of Supply', 'Rate', 'Taxable Value', 'IGST', 'CGST', 'SGST']]),
        toCsv(b2c.map((r) => [r.placeOfSupply, r.rate, r.taxableValue.toFixed(2), r.igstAmount.toFixed(2), r.cgstAmount.toFixed(2), r.sgstAmount.toFixed(2)])),
        '',
        toCsv([['HSN/SAC SUMMARY'], ['HSN/SAC', 'Rate', 'Total Quantity', 'Taxable Value', 'IGST', 'CGST', 'SGST']]),
        toCsv(hsn.map((r) => [r.hsnSac, r.rate, r.totalQuantity.toString(), r.taxableValue.toFixed(2), r.igstAmount.toFixed(2), r.cgstAmount.toFixed(2), r.sgstAmount.toFixed(2)])),
      ].join('\n');
      contentType = 'text/csv';
      filename = `gstr1-sales-${query.from}_to_${query.to}.csv`;
    } else {
      const salesVouchers: TallyVoucherInput[] = invoices.map((inv) =>
        buildSalesVoucher({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.createdAt,
          customerName: inv.customer.name,
          subtotal: inv.subtotal,
          cgstAmount: inv.cgstAmount,
          sgstAmount: inv.sgstAmount,
          igstAmount: inv.igstAmount,
          roundOff: inv.roundOff,
          grandTotal: inv.grandTotal,
        }),
      );
      const receiptVouchers: TallyVoucherInput[] = invoices.flatMap((inv) =>
        inv.payments.map((p) =>
          buildReceiptVoucher({
            reference: p.referenceNumber ?? p.id,
            paymentDate: p.paymentDate,
            customerName: inv.customer.name,
            amount: p.amount,
            method: p.method,
          }),
        ),
      );
      const { xml, skipped } = buildTallyVoucherXml([...salesVouchers, ...receiptVouchers], tenant?.name ?? 'AutoNexa Workshop');
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

  private async exportPurchases(query: ExportGstQueryDto, userId: string, isPreview: boolean): Promise<GstExportResult> {
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();

    const [tenant, purchaseInvoices] = await Promise.all([
      this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      db.purchaseInvoice.findMany({
        where: dateRangeWhere('invoiceDate', query.from, query.to),
        include: { purchaseOrder: { include: { supplier: { select: { name: true, gstin: true } } } }, payments: true },
        orderBy: { invoiceDate: 'asc' },
      }),
    ]);

    const registerLines: PurchaseRegisterLineInput[] = purchaseInvoices.map((pi) => ({
      supplierName: pi.purchaseOrder.supplier.name,
      supplierGstin: pi.purchaseOrder.supplier.gstin,
      supplierInvoiceNumber: pi.supplierInvoiceNumber,
      invoiceDate: pi.invoiceDate,
      subtotal: pi.subtotal,
      taxAmount: pi.taxAmount,
      total: pi.total,
    }));

    const itcTotals = summarizePurchaseItc(registerLines);
    const warnings: string[] = [
      'Purchase-side figures are approximate: PurchaseInvoice has no HSN-wise or CGST/SGST/IGST breakdown, so tax is shown as one blended amount, split evenly into CGST+SGST assuming an in-state supplier. Correct for GSTR-3B\'s aggregate ITC total; not accurate per-tax-head for an inter-state supplier.',
    ];
    const missingGstinCount = countMissingSupplierGstin(registerLines);
    if (missingGstinCount > 0) {
      warnings.push(`${missingGstinCount} purchase invoice(s) have a supplier with no GSTIN on file — shown as UNREGISTERED.`);
    }

    const manifestEntries: ManifestEntry[] = purchaseInvoices.map((pi) => ({
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

    let content: string;
    let contentType: string;
    let filename: string;

    if (query.format === 'gstr-csv') {
      const rows = buildPurchaseRegisterRows(registerLines);
      content = [
        toCsv([['PURCHASE REGISTER (approximate — see warnings)'], ['Supplier', 'Supplier GSTIN', 'Supplier Invoice No', 'Invoice Date', 'Taxable Value', 'Tax Amount', 'Total']]),
        toCsv(rows.map((r) => [r.supplierName, r.supplierGstin, r.supplierInvoiceNumber, r.invoiceDate, r.taxableValue.toFixed(2), r.taxAmount.toFixed(2), r.total.toFixed(2)])),
        '',
        toCsv([['GSTR-3B ITC SUMMARY (Table 4A aggregate)'], ['Invoice Count', 'Taxable Value', 'Tax Amount (ITC available)', 'Total']]),
        toCsv([[itcTotals.invoiceCount, itcTotals.taxableValue.toFixed(2), itcTotals.taxAmount.toFixed(2), itcTotals.total.toFixed(2)]]),
      ].join('\n');
      contentType = 'text/csv';
      filename = `gstr3b-purchases-${query.from}_to_${query.to}.csv`;
    } else {
      const purchaseVouchers: TallyVoucherInput[] = purchaseInvoices.map((pi) =>
        buildPurchaseVoucher({
          supplierInvoiceNumber: pi.supplierInvoiceNumber,
          invoiceDate: pi.invoiceDate,
          supplierName: pi.purchaseOrder.supplier.name,
          subtotal: pi.subtotal,
          taxAmount: pi.taxAmount,
          total: pi.total,
        }),
      );
      const paymentVouchers: TallyVoucherInput[] = purchaseInvoices.flatMap((pi) =>
        pi.payments.map((p) =>
          buildPaymentVoucher({
            reference: p.referenceNumber ?? p.id,
            paymentDate: p.paymentDate,
            supplierName: pi.purchaseOrder.supplier.name,
            amount: p.amount,
            method: p.method,
          }),
        ),
      );
      const { xml, skipped } = buildTallyVoucherXml([...purchaseVouchers, ...paymentVouchers], tenant?.name ?? 'AutoNexa Workshop');
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

  /** Read-only — used for `?preview=true`, which never creates or reuses a stored batch. */
  private async previewAmendments(
    db: ReturnType<PrismaService['forTenant']>,
    side: 'sales' | 'purchases',
    from: string,
    to: string,
    currentManifest: ManifestEntry[],
  ): Promise<{ amended: AmendedEntry[]; supersedesBatchNumber: string | null }> {
    const latestOverlapping = await db.gstExportBatch.findFirst({
      where: { side, periodFrom: { lte: new Date(to) }, periodTo: { gte: new Date(from) } },
      orderBy: { generatedAt: 'desc' },
      select: { batchNumber: true, manifest: true },
    });
    if (!latestOverlapping) return { amended: [], supersedesBatchNumber: null };

    return {
      amended: diffManifest(latestOverlapping.manifest as unknown as ManifestEntry[], currentManifest),
      supersedesBatchNumber: latestOverlapping.batchNumber,
    };
  }

  /**
   * Idempotent: re-running an export for the exact same period with an
   * unchanged manifest reattaches to the SAME batch number rather than
   * minting a new one — an accountant re-downloading a file they already
   * have shouldn't produce a second, indistinguishable batch reference.
   * Only a genuinely different manifest for that period (or a first-time
   * export) consumes a new sequence number and writes a new row; in that
   * case it's also diffed against the latest batch on any OVERLAPPING
   * period so an amendment is flagged rather than silently blended in.
   */
  private async resolveBatch(
    db: ReturnType<PrismaService['forTenant']>,
    tenantId: string,
    side: 'sales' | 'purchases',
    format: string,
    from: string,
    to: string,
    userId: string,
    manifest: ManifestEntry[],
  ): Promise<{ batchNumber: string; amended: AmendedEntry[]; supersedesBatchNumber: string | null }> {
    const exactPrior = await db.gstExportBatch.findFirst({
      where: { side, periodFrom: new Date(from), periodTo: new Date(to) },
      orderBy: { generatedAt: 'desc' },
      select: { batchNumber: true, manifest: true },
    });

    if (exactPrior && manifestsAreEqual(exactPrior.manifest as unknown as ManifestEntry[], manifest)) {
      return { batchNumber: exactPrior.batchNumber, amended: [], supersedesBatchNumber: null };
    }

    const latestOverlapping = await db.gstExportBatch.findFirst({
      where: { side, periodFrom: { lte: new Date(to) }, periodTo: { gte: new Date(from) } },
      orderBy: { generatedAt: 'desc' },
      select: { batchNumber: true, manifest: true },
    });
    const amended = latestOverlapping ? diffManifest(latestOverlapping.manifest as unknown as ManifestEntry[], manifest) : [];

    const batchNumber = await db.$transaction(async (tx) => {
      const num = await generateSequenceNumber(tx as unknown as Prisma.TransactionClient, tenantId, 'GST_EXPORT', 'GSTEXP');
      await tx.gstExportBatch.create({
        data: {
          batchNumber: num,
          side,
          format,
          periodFrom: new Date(from),
          periodTo: new Date(to),
          generatedByUserId: userId,
          manifest: manifest as unknown as Prisma.InputJsonValue,
        } as unknown as Prisma.GstExportBatchUncheckedCreateInput,
      });
      return num;
    });

    return { batchNumber, amended, supersedesBatchNumber: latestOverlapping?.batchNumber ?? null };
  }
}
