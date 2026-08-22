"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeXml = escapeXml;
exports.isVoucherBalanced = isVoucherBalanced;
exports.buildTallyVoucherXml = buildTallyVoucherXml;
const client_1 = require("@prisma/client");
function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function formatTallyDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}
function isVoucherBalanced(voucher) {
    let debit = new client_1.Prisma.Decimal(0);
    let credit = new client_1.Prisma.Decimal(0);
    for (const entry of voucher.ledgerEntries) {
        if (entry.isDebit)
            debit = debit.add(entry.amount);
        else
            credit = credit.add(entry.amount);
    }
    return debit.toDecimalPlaces(2).equals(credit.toDecimalPlaces(2));
}
function buildLedgerEntryXml(entry) {
    const amount = new client_1.Prisma.Decimal(entry.amount).toDecimalPlaces(2);
    const signedAmount = entry.isDebit ? amount.neg() : amount;
    return [
        '<LEDGERENTRIES.LIST>',
        `<LEDGERNAME>${escapeXml(entry.ledgerName)}</LEDGERNAME>`,
        `<ISDEEMEDPOSITIVE>${entry.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>`,
        `<AMOUNT>${signedAmount.toFixed(2)}</AMOUNT>`,
        '</LEDGERENTRIES.LIST>',
    ].join('');
}
function buildVoucherXml(voucher) {
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
function buildTallyVoucherXml(vouchers, tenantName) {
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
//# sourceMappingURL=tally-xml.js.map