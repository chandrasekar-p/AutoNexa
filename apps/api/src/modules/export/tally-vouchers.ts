import { Prisma } from '@prisma/client';
import { TallyLedgerEntry, TallyVoucherInput } from './tally-xml';

type Decimalish = Prisma.Decimal | number | string;

/**
 * Ledger-naming convention for this v1 — fixed, not per-tenant configurable
 * yet. A workshop's actual Tally company will very likely use different
 * ledger names; the accountant is expected to either rename these ledgers
 * in Tally to match, or use Tally's own import-mapping screen to remap
 * them. Documented in the README rather than silently assumed correct.
 */
const LEDGER = {
  SALES: 'Sales Account',
  OUTPUT_CGST: 'Output CGST',
  OUTPUT_SGST: 'Output SGST',
  OUTPUT_IGST: 'Output IGST',
  ROUND_OFF: 'Round Off',
  PURCHASE: 'Purchase Account',
  INPUT_CGST: 'Input CGST',
  INPUT_SGST: 'Input SGST',
  CASH: 'Cash',
  BANK: 'Bank Account',
};

function bankLedgerForMethod(method: string): string {
  return method === 'cash' ? LEDGER.CASH : LEDGER.BANK;
}

function isPositive(amount: Decimalish): boolean {
  return new Prisma.Decimal(amount).greaterThan(0);
}

export interface SalesVoucherInput {
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  subtotal: Decimalish;
  cgstAmount: Decimalish;
  sgstAmount: Decimalish;
  igstAmount: Decimalish;
  roundOff: Decimalish;
  grandTotal: Decimalish;
}

export function buildSalesVoucher(invoice: SalesVoucherInput): TallyVoucherInput {
  const ledgerEntries: TallyLedgerEntry[] = [
    { ledgerName: invoice.customerName, amount: invoice.grandTotal, isDebit: true },
    { ledgerName: LEDGER.SALES, amount: invoice.subtotal, isDebit: false },
  ];
  if (isPositive(invoice.cgstAmount)) ledgerEntries.push({ ledgerName: LEDGER.OUTPUT_CGST, amount: invoice.cgstAmount, isDebit: false });
  if (isPositive(invoice.sgstAmount)) ledgerEntries.push({ ledgerName: LEDGER.OUTPUT_SGST, amount: invoice.sgstAmount, isDebit: false });
  if (isPositive(invoice.igstAmount)) ledgerEntries.push({ ledgerName: LEDGER.OUTPUT_IGST, amount: invoice.igstAmount, isDebit: false });

  const roundOff = new Prisma.Decimal(invoice.roundOff);
  if (!roundOff.equals(0)) {
    ledgerEntries.push({ ledgerName: LEDGER.ROUND_OFF, amount: roundOff.abs(), isDebit: roundOff.lessThan(0) });
  }

  return {
    voucherType: 'Sales',
    voucherNumber: invoice.invoiceNumber,
    date: invoice.invoiceDate,
    partyLedgerName: invoice.customerName,
    ledgerEntries,
  };
}

export interface ReceiptVoucherInput {
  reference: string;
  paymentDate: Date;
  customerName: string;
  amount: Decimalish;
  method: string;
}

export function buildReceiptVoucher(payment: ReceiptVoucherInput): TallyVoucherInput {
  return {
    voucherType: 'Receipt',
    voucherNumber: payment.reference,
    date: payment.paymentDate,
    partyLedgerName: payment.customerName,
    ledgerEntries: [
      { ledgerName: bankLedgerForMethod(payment.method), amount: payment.amount, isDebit: true },
      { ledgerName: payment.customerName, amount: payment.amount, isDebit: false },
    ],
  };
}

export interface PurchaseVoucherInput {
  supplierInvoiceNumber: string;
  invoiceDate: Date;
  supplierName: string;
  subtotal: Decimalish;
  taxAmount: Decimalish;
  total: Decimalish;
}

/**
 * Approximate — see the architecture doc's purchase-side fidelity note.
 * PurchaseInvoice stores one blended taxAmount, not a CGST/SGST/IGST split
 * (Supplier has no `state` field to determine inter- vs intra-state), so
 * this always assumes same-state and splits taxAmount evenly into Input
 * CGST/Input SGST. Correct for GSTR-3B's aggregate ITC total; not accurate
 * per-tax-head for an inter-state supplier.
 */
export function buildPurchaseVoucher(invoice: PurchaseVoucherInput): TallyVoucherInput {
  const ledgerEntries: TallyLedgerEntry[] = [{ ledgerName: LEDGER.PURCHASE, amount: invoice.subtotal, isDebit: true }];

  const tax = new Prisma.Decimal(invoice.taxAmount);
  if (tax.greaterThan(0)) {
    const half = tax.div(2).toDecimalPlaces(2);
    ledgerEntries.push({ ledgerName: LEDGER.INPUT_CGST, amount: half, isDebit: true });
    ledgerEntries.push({ ledgerName: LEDGER.INPUT_SGST, amount: tax.sub(half), isDebit: true });
  }

  ledgerEntries.push({ ledgerName: invoice.supplierName, amount: invoice.total, isDebit: false });

  return {
    voucherType: 'Purchase',
    voucherNumber: invoice.supplierInvoiceNumber,
    date: invoice.invoiceDate,
    partyLedgerName: invoice.supplierName,
    ledgerEntries,
  };
}

export interface PaymentVoucherInput {
  reference: string;
  paymentDate: Date;
  supplierName: string;
  amount: Decimalish;
  method: string;
}

export function buildPaymentVoucher(payment: PaymentVoucherInput): TallyVoucherInput {
  return {
    voucherType: 'Payment',
    voucherNumber: payment.reference,
    date: payment.paymentDate,
    partyLedgerName: payment.supplierName,
    ledgerEntries: [
      { ledgerName: payment.supplierName, amount: payment.amount, isDebit: true },
      { ledgerName: bankLedgerForMethod(payment.method), amount: payment.amount, isDebit: false },
    ],
  };
}
