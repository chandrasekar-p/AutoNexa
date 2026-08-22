import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface PurchaseRegisterLineInput {
  supplierName: string;
  supplierGstin: string | null;
  supplierInvoiceNumber: string;
  invoiceDate: Date;
  subtotal: Decimalish;
  taxAmount: Decimalish;
  total: Decimalish;
}

export interface PurchaseRegisterRow {
  supplierName: string;
  supplierGstin: string;
  supplierInvoiceNumber: string;
  invoiceDate: string;
  taxableValue: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/** Invoice-wise purchase register — no HSN/rate breakdown (see architecture doc's purchase-side fidelity note: PurchaseInvoice has no line items to break down). */
export function buildPurchaseRegisterRows(invoices: PurchaseRegisterLineInput[]): PurchaseRegisterRow[] {
  return invoices.map((invoice) => ({
    supplierName: invoice.supplierName,
    supplierGstin: invoice.supplierGstin ?? 'UNREGISTERED',
    supplierInvoiceNumber: invoice.supplierInvoiceNumber,
    invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
    taxableValue: new Prisma.Decimal(invoice.subtotal).toDecimalPlaces(2),
    taxAmount: new Prisma.Decimal(invoice.taxAmount).toDecimalPlaces(2),
    total: new Prisma.Decimal(invoice.total).toDecimalPlaces(2),
  }));
}

export interface PurchaseItcTotals {
  invoiceCount: number;
  taxableValue: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/** Aggregate ITC available — matches what GSTR-3B Table 4A needs (a total, not a rate/HSN-wise split). */
export function summarizePurchaseItc(invoices: PurchaseRegisterLineInput[]): PurchaseItcTotals {
  let taxableValue = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);
  let total = new Prisma.Decimal(0);

  for (const invoice of invoices) {
    taxableValue = taxableValue.add(invoice.subtotal);
    taxAmount = taxAmount.add(invoice.taxAmount);
    total = total.add(invoice.total);
  }

  return {
    invoiceCount: invoices.length,
    taxableValue: taxableValue.toDecimalPlaces(2),
    taxAmount: taxAmount.toDecimalPlaces(2),
    total: total.toDecimalPlaces(2),
  };
}

export function countMissingSupplierGstin(invoices: PurchaseRegisterLineInput[]): number {
  return invoices.filter((i) => !i.supplierGstin).length;
}
