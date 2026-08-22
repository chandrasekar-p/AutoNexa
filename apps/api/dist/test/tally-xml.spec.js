"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tally_xml_1 = require("../src/modules/export/tally-xml");
function balancedVoucher(overrides = {}) {
    return {
        voucherType: 'Sales',
        voucherNumber: 'INV-0001',
        date: new Date('2026-07-15'),
        partyLedgerName: 'Ravi Kumar',
        ledgerEntries: [
            { ledgerName: 'Ravi Kumar', amount: 1180, isDebit: true },
            { ledgerName: 'Sales Account', amount: 1000, isDebit: false },
            { ledgerName: 'Output CGST', amount: 90, isDebit: false },
            { ledgerName: 'Output SGST', amount: 90, isDebit: false },
        ],
        ...overrides,
    };
}
describe('escapeXml', () => {
    it('escapes the five XML special characters', () => {
        expect((0, tally_xml_1.escapeXml)(`<a href="x">O'Brien & Sons</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;O&apos;Brien &amp; Sons&lt;/a&gt;');
    });
});
describe('isVoucherBalanced', () => {
    it('is true when total debits equal total credits', () => {
        expect((0, tally_xml_1.isVoucherBalanced)(balancedVoucher())).toBe(true);
    });
    it('is false when debits and credits differ', () => {
        const unbalanced = balancedVoucher({ ledgerEntries: [{ ledgerName: 'A', amount: 100, isDebit: true }, { ledgerName: 'B', amount: 90, isDebit: false }] });
        expect((0, tally_xml_1.isVoucherBalanced)(unbalanced)).toBe(false);
    });
});
describe('buildTallyVoucherXml', () => {
    it('produces a well-formed envelope containing every balanced voucher', () => {
        const { xml, skipped } = (0, tally_xml_1.buildTallyVoucherXml)([balancedVoucher()], 'Demo Workshop');
        expect(skipped).toHaveLength(0);
        expect(xml).toContain('<ENVELOPE>');
        expect(xml).toContain('<VOUCHERNUMBER>INV-0001</VOUCHERNUMBER>');
        expect(xml).toContain('<SVCURRENTCOMPANY>Demo Workshop</SVCURRENTCOMPANY>');
        expect(xml).toContain('VCHTYPE="Sales"');
    });
    it('excludes an unbalanced voucher from the XML and reports it as skipped, rather than sending Tally a bad envelope', () => {
        const unbalanced = balancedVoucher({
            voucherNumber: 'INV-BAD',
            ledgerEntries: [{ ledgerName: 'A', amount: 100, isDebit: true }, { ledgerName: 'B', amount: 50, isDebit: false }],
        });
        const { xml, skipped } = (0, tally_xml_1.buildTallyVoucherXml)([balancedVoucher(), unbalanced], 'Demo Workshop');
        expect(skipped).toEqual([unbalanced]);
        expect(xml).not.toContain('INV-BAD');
        expect(xml).toContain('INV-0001');
    });
    it('escapes special characters in ledger/party names', () => {
        const voucher = balancedVoucher({ partyLedgerName: `O'Brien & Sons` });
        const { xml } = (0, tally_xml_1.buildTallyVoucherXml)([voucher], 'Demo Workshop');
        expect(xml).toContain('O&apos;Brien &amp; Sons');
    });
});
//# sourceMappingURL=tally-xml.spec.js.map