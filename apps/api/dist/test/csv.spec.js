"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csv_1 = require("../src/modules/export/csv");
describe('toCsvRow', () => {
    it('joins plain fields with commas, unquoted', () => {
        expect((0, csv_1.toCsvRow)(['a', 'b', 1])).toBe('a,b,1');
    });
    it('quotes a field containing a comma', () => {
        expect((0, csv_1.toCsvRow)(['Acme, Inc', 'ok'])).toBe('"Acme, Inc",ok');
    });
    it('doubles embedded quotes and wraps the field in quotes', () => {
        expect((0, csv_1.toCsvRow)(['He said "hi"'])).toBe('"He said ""hi"""');
    });
    it('quotes a field containing a newline', () => {
        expect((0, csv_1.toCsvRow)(['line1\nline2'])).toBe('"line1\nline2"');
    });
});
describe('toCsv', () => {
    it('joins rows with newlines', () => {
        expect((0, csv_1.toCsv)([['a', 'b'], ['c', 'd']])).toBe('a,b\nc,d');
    });
});
//# sourceMappingURL=csv.spec.js.map