"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generate_sequence_number_1 = require("../src/common/sequence/generate-sequence-number");
describe('formatSequenceNumber', () => {
    it('pads a small number to the default 4 digits with the given prefix', () => {
        expect((0, generate_sequence_number_1.formatSequenceNumber)('JC', 1)).toBe('JC-0001');
    });
    it('pads correctly for a mid-range number', () => {
        expect((0, generate_sequence_number_1.formatSequenceNumber)('JC', 42)).toBe('JC-0042');
    });
    it('does not truncate a number wider than padLength', () => {
        expect((0, generate_sequence_number_1.formatSequenceNumber)('JC', 12345)).toBe('JC-12345');
    });
    it('respects a custom padLength', () => {
        expect((0, generate_sequence_number_1.formatSequenceNumber)('INV', 7, 6)).toBe('INV-000007');
    });
});
//# sourceMappingURL=generate-sequence-number.spec.js.map