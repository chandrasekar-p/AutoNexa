"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildB2bRows = buildB2bRows;
exports.buildB2cSummaryRows = buildB2cSummaryRows;
exports.buildHsnSummaryRows = buildHsnSummaryRows;
exports.countMissingHsn = countMissingHsn;
const client_1 = require("@prisma/client");
const gst_split_1 = require("../invoices/gst-split");
function splitLine(line, tenantState, customerState) {
    const split = (0, gst_split_1.calculateGstSplit)([{ lineTotal: line.lineTotal, gstRate: line.gstRate }], tenantState, customerState);
    return { taxableValue: split.subtotal, cgstAmount: split.cgstAmount, sgstAmount: split.sgstAmount, igstAmount: split.igstAmount };
}
function rateLabel(rate) {
    return new client_1.Prisma.Decimal(rate).toString();
}
function buildB2bRows(invoices, tenantState) {
    const rows = [];
    for (const invoice of invoices) {
        if (!invoice.customerGstin)
            continue;
        const byRate = new Map();
        for (const line of invoice.lineItems) {
            const split = splitLine(line, tenantState, invoice.customerState);
            const key = rateLabel(line.gstRate);
            const existing = byRate.get(key);
            byRate.set(key, existing
                ? {
                    taxableValue: existing.taxableValue.add(split.taxableValue),
                    cgstAmount: existing.cgstAmount.add(split.cgstAmount),
                    sgstAmount: existing.sgstAmount.add(split.sgstAmount),
                    igstAmount: existing.igstAmount.add(split.igstAmount),
                }
                : split);
        }
        for (const [rate, split] of byRate.entries()) {
            rows.push({
                gstin: invoice.customerGstin,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
                invoiceValue: new client_1.Prisma.Decimal(invoice.grandTotal).toDecimalPlaces(2),
                rate,
                taxableValue: split.taxableValue,
                igstAmount: split.igstAmount,
                cgstAmount: split.cgstAmount,
                sgstAmount: split.sgstAmount,
            });
        }
    }
    return rows;
}
function buildB2cSummaryRows(invoices, tenantState) {
    const buckets = new Map();
    for (const invoice of invoices) {
        if (invoice.customerGstin)
            continue;
        const placeOfSupply = invoice.customerState ?? 'UNKNOWN';
        for (const line of invoice.lineItems) {
            const split = splitLine(line, tenantState, invoice.customerState);
            const key = `${placeOfSupply}::${rateLabel(line.gstRate)}`;
            const existing = buckets.get(key);
            buckets.set(key, existing
                ? {
                    taxableValue: existing.taxableValue.add(split.taxableValue),
                    cgstAmount: existing.cgstAmount.add(split.cgstAmount),
                    sgstAmount: existing.sgstAmount.add(split.sgstAmount),
                    igstAmount: existing.igstAmount.add(split.igstAmount),
                }
                : split);
        }
    }
    return [...buckets.entries()].map(([key, split]) => {
        const [placeOfSupply, rate] = key.split('::');
        return { placeOfSupply, rate, ...split };
    });
}
function buildHsnSummaryRows(invoices, tenantState) {
    const buckets = new Map();
    for (const invoice of invoices) {
        for (const line of invoice.lineItems) {
            const split = splitLine(line, tenantState, invoice.customerState);
            const hsnSac = line.hsnSac ?? 'UNSPECIFIED';
            const key = `${hsnSac}::${rateLabel(line.gstRate)}`;
            const existing = buckets.get(key);
            const quantity = new client_1.Prisma.Decimal(line.quantity);
            buckets.set(key, existing
                ? {
                    taxableValue: existing.taxableValue.add(split.taxableValue),
                    cgstAmount: existing.cgstAmount.add(split.cgstAmount),
                    sgstAmount: existing.sgstAmount.add(split.sgstAmount),
                    igstAmount: existing.igstAmount.add(split.igstAmount),
                    totalQuantity: existing.totalQuantity.add(quantity),
                }
                : { ...split, totalQuantity: quantity });
        }
    }
    return [...buckets.entries()].map(([key, bucket]) => {
        const [hsnSac, rate] = key.split('::');
        return { hsnSac, rate, ...bucket };
    });
}
function countMissingHsn(invoices) {
    return invoices.reduce((count, invoice) => count + invoice.lineItems.filter((l) => !l.hsnSac).length, 0);
}
//# sourceMappingURL=gstr1-rows.js.map