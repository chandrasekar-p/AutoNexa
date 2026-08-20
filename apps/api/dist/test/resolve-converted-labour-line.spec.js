"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolve_converted_labour_line_1 = require("../src/modules/job-cards/resolve-converted-labour-line");
describe('resolveConvertedLabourLine', () => {
    it('uses the estimate line rate/gstRate and leaves labourItemId/hsnSac unset when there is no catalogue match', () => {
        const result = (0, resolve_converted_labour_line_1.resolveConvertedLabourLine)({ unitPrice: 600, gstRate: 18 }, null);
        expect(result).toEqual({ labourItemId: undefined, rate: 600, gstRate: 18, hsnSac: null });
    });
    it('populates labourItemId/hsnSac from a catalogue match but still charges the estimate-approved price, not the catalogue rate', () => {
        const result = (0, resolve_converted_labour_line_1.resolveConvertedLabourLine)({ unitPrice: 600, gstRate: 18 }, { id: 'labour-item-1', sacCode: '998714' });
        expect(result).toEqual({ labourItemId: 'labour-item-1', rate: 600, gstRate: 18, hsnSac: '998714' });
    });
});
//# sourceMappingURL=resolve-converted-labour-line.spec.js.map