import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export type TallyVoucherType = 'Sales' | 'Purchase' | 'Receipt' | 'Payment';

export interface TallyLedgerEntry {
  ledgerName: string;
  amount: Decimalish; // always a positive magnitude — direction comes from isDebit
  isDebit: boolean;
}

export interface TallyVoucherInput {
  voucherType: TallyVoucherType;
  voucherNumber: string;
  date: Date;
  partyLedgerName: string;
  narration?: string;
  ledgerEntries: TallyLedgerEntry[];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatTallyDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Every voucher must balance — total debits equal total credits — or Tally will reject the whole import batch. */
export function isVoucherBalanced(voucher: TallyVoucherInput): boolean {
  let debit = new Prisma.Decimal(0);
  let credit = new Prisma.Decimal(0);
  for (const entry of voucher.ledgerEntries) {
    if (entry.isDebit) debit = debit.add(entry.amount);
    else credit = credit.add(entry.amount);
  }
  return debit.toDecimalPlaces(2).equals(credit.toDecimalPlaces(2));
}

function buildLedgerEntryXml(entry: TallyLedgerEntry): string {
  const amount = new Prisma.Decimal(entry.amount).toDecimalPlaces(2);
  // Tally XML convention: negative AMOUNT = debit, positive AMOUNT = credit,
  // paired with an explicit ISDEEMEDPOSITIVE flag mirroring the same sign.
  const signedAmount = entry.isDebit ? amount.neg() : amount;
  return [
    '<LEDGERENTRIES.LIST>',
    `<LEDGERNAME>${escapeXml(entry.ledgerName)}</LEDGERNAME>`,
    `<ISDEEMEDPOSITIVE>${entry.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>`,
    `<AMOUNT>${signedAmount.toFixed(2)}</AMOUNT>`,
    '</LEDGERENTRIES.LIST>',
  ].join('');
}

function buildVoucherXml(voucher: TallyVoucherInput): string {
  const entries = voucher.ledgerEntries.map(buildLedgerEntryXml).join('');
  return [
    '<TALLYMESSAGE xmlns:UDF="TallyUDF">',
    `<VOUCHER VCHTYPE="${escapeXml(voucher.voucherType)}" ACTION="Create">`,
    `<DATE>${formatTallyDate(voucher.date)}</DATE>`,
    `<VOUCHERTYPENAME>${escapeXml(voucher.voucherType)}</VOUCHERTYPENAME>`,
    `<VOUCHERNUMBER>${escapeXml(voucher.voucherNumber)}</VOUCHERNUMBER>`,
    `<PARTYLEDGERNAME>${escapeXml(voucher.partyLedgerName)}</PARTYLEDGERNAME>`,
    voucher.narration ? `<NARRATION>${escapeXml(voucher.narration)}</NARRATION>` : '',
    entries,
    '</VOUCHER>',
    '</TALLYMESSAGE>',
  ]
    .filter(Boolean)
    .join('');
}

/**
 * Wraps a set of vouchers in a Tally-importable XML envelope
 * (Import Data / Vouchers request). Vouchers that don't balance are
 * excluded rather than sent to Tally (which would reject the whole
 * envelope) — the caller is expected to check `skipped` and surface it,
 * not silently lose vouchers.
 */
export function buildTallyVoucherXml(vouchers: TallyVoucherInput[], tenantName: string): { xml: string; skipped: TallyVoucherInput[] } {
  const balanced = vouchers.filter(isVoucherBalanced);
  const skipped = vouchers.filter((v) => !isVoucherBalanced(v));

  const messages = balanced.map(buildVoucherXml).join('');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ENVELOPE>',
    '<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>',
    '<BODY>',
    '<IMPORTDATA>',
    '<REQUESTDESC>',
    '<REPORTNAME>Vouchers</REPORTNAME>',
    `<STATICVARIABLES><SVCURRENTCOMPANY>${escapeXml(tenantName)}</SVCURRENTCOMPANY></STATICVARIABLES>`,
    '</REQUESTDESC>',
    '<REQUESTDATA>',
    messages,
    '</REQUESTDATA>',
    '</IMPORTDATA>',
    '</BODY>',
    '</ENVELOPE>',
  ].join('');

  return { xml, skipped };
}
