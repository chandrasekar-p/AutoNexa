"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const export_manifest_diff_1 = require("../src/modules/export/export-manifest-diff");
function entry(overrides = {}) {
    return { type: 'purchaseInvoice', sourceId: 'pi-1', referenceNumber: 'SUP-0001', amount: '1180.00', ...overrides };
}
describe('diffManifest', () => {
    it('flags a voucher whose amount changed since the prior batch', () => {
        const previous = [entry({ amount: '1180.00' })];
        const current = [entry({ amount: '1250.00' })];
        expect((0, export_manifest_diff_1.diffManifest)(previous, current)).toEqual([{ sourceId: 'pi-1', referenceNumber: 'SUP-0001', previousAmount: '1180.00', currentAmount: '1250.00' }]);
    });
    it('does not flag a voucher with the same amount, even if formatted differently ("1180" vs "1180.00")', () => {
        const previous = [entry({ amount: '1180' })];
        const current = [entry({ amount: '1180.00' })];
        expect((0, export_manifest_diff_1.diffManifest)(previous, current)).toEqual([]);
    });
    it('does not flag a brand-new voucher that has no prior counterpart', () => {
        const previous = [];
        const current = [entry()];
        expect((0, export_manifest_diff_1.diffManifest)(previous, current)).toEqual([]);
    });
    it('does not double-count a voucher present in both when nothing changed', () => {
        const previous = [entry(), entry({ sourceId: 'pi-2', amount: '500' })];
        const current = [entry(), entry({ sourceId: 'pi-2', amount: '500' })];
        expect((0, export_manifest_diff_1.diffManifest)(previous, current)).toEqual([]);
    });
    it('ignores a voucher that disappeared from the current period (not this function\'s concern)', () => {
        const previous = [entry(), entry({ sourceId: 'pi-2', amount: '500' })];
        const current = [entry()];
        expect((0, export_manifest_diff_1.diffManifest)(previous, current)).toEqual([]);
    });
});
describe('manifestsAreEqual', () => {
    it('is true for identical manifests', () => {
        expect((0, export_manifest_diff_1.manifestsAreEqual)([entry()], [entry()])).toBe(true);
    });
    it('is true regardless of entry order', () => {
        const a = [entry({ sourceId: 'a' }), entry({ sourceId: 'b', amount: '50' })];
        const b = [entry({ sourceId: 'b', amount: '50' }), entry({ sourceId: 'a' })];
        expect((0, export_manifest_diff_1.manifestsAreEqual)(a, b)).toBe(true);
    });
    it('is false when a voucher amount differs', () => {
        expect((0, export_manifest_diff_1.manifestsAreEqual)([entry({ amount: '100' })], [entry({ amount: '200' })])).toBe(false);
    });
    it('is false when the voucher count differs', () => {
        expect((0, export_manifest_diff_1.manifestsAreEqual)([entry()], [entry(), entry({ sourceId: 'pi-2' })])).toBe(false);
    });
});
//# sourceMappingURL=export-manifest-diff.spec.js.map