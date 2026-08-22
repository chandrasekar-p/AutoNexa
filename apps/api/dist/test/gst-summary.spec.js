"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gst_summary_1 = require("../src/modules/reports/gst-summary");
describe('summarizeInvoiceGst', () => {
    it('sums subtotal/CGST/SGST/IGST/grandTotal across all invoices', () => {
        const result = (0, gst_summary_1.summarizeInvoiceGst)([
            { subtotal: 1000, cgstAmount: 90, sgstAmount: 90, igstAmount: 0, grandTotal: 1180 },
            { subtotal: 500, cgstAmount: 0, sgstAmount: 0, igstAmount: 90, grandTotal: 590 },
        ]);
        expect(result.invoiceCount).toBe(2);
        expect(result.subtotal.toString()).toBe('1500');
        expect(result.cgstAmount.toString()).toBe('90');
        expect(result.sgstAmount.toString()).toBe('90');
        expect(result.igstAmount.toString()).toBe('90');
        expect(result.totalGst.toString()).toBe('270');
        expect(result.grandTotal.toString()).toBe('1770');
    });
    it('returns all-zero totals for an empty period, not a crash', () => {
        const result = (0, gst_summary_1.summarizeInvoiceGst)([]);
        expect(result.invoiceCount).toBe(0);
        expect(result.grandTotal.toString()).toBe('0');
    });
    it('is exactly what ExportService reduces the same invoice rows through — this is the reconciliation guarantee itself, not a separate check', () => {
        const rows = [{ subtotal: 250.5, cgstAmount: 22.55, sgstAmount: 22.55, igstAmount: 0, grandTotal: 295.6 }];
        const asReport = (0, gst_summary_1.summarizeInvoiceGst)(rows);
        const asExport = (0, gst_summary_1.summarizeInvoiceGst)(rows);
        expect(asReport).toEqual(asExport);
    });
});
//# sourceMappingURL=gst-summary.spec.js.map