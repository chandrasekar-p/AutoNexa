"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const column_totals_1 = require("../src/modules/reports/column-totals");
describe('computeColumnTotals', () => {
    it('sums plain-number columns', () => {
        expect((0, column_totals_1.computeColumnTotals)([{ count: 3 }, { count: 5 }])).toEqual({ count: 8 });
    });
    it('sums Prisma.Decimal columns', () => {
        const totals = (0, column_totals_1.computeColumnTotals)([
            { totalOutstanding: new client_1.Prisma.Decimal('100.50') },
            { totalOutstanding: new client_1.Prisma.Decimal('49.50') },
        ]);
        expect(totals).toEqual({ totalOutstanding: 150 });
    });
    it('excludes a column that is not numeric in every row', () => {
        const totals = (0, column_totals_1.computeColumnTotals)([{ count: 3, status: 'OPEN' }, { count: 5, status: 'CLOSED' }]);
        expect(totals).toEqual({ count: 8 });
    });
    it('excludes a column with a null value in any row', () => {
        const totals = (0, column_totals_1.computeColumnTotals)([{ hours: 2 }, { hours: null }]);
        expect(totals).toEqual({});
    });
    it('excludes nested objects (e.g. a joined customer/supplier)', () => {
        const totals = (0, column_totals_1.computeColumnTotals)([
            { revenue: 100, customer: { id: '1', name: 'A' } },
            { revenue: 200, customer: { id: '2', name: 'B' } },
        ]);
        expect(totals).toEqual({ revenue: 300 });
    });
    it('excludes the id column', () => {
        const totals = (0, column_totals_1.computeColumnTotals)([{ id: '1', amount: 10 }, { id: '2', amount: 20 }]);
        expect(totals).toEqual({ amount: 30 });
    });
    it('returns an empty object for no rows', () => {
        expect((0, column_totals_1.computeColumnTotals)([])).toEqual({});
    });
});
//# sourceMappingURL=column-totals.spec.js.map