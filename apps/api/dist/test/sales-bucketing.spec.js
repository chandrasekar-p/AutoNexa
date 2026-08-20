"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_bucketing_1 = require("../src/modules/reports/sales-bucketing");
describe('bucketSales', () => {
    it('buckets by day and sums amounts within the same day', () => {
        const buckets = (0, sales_bucketing_1.bucketSales)([
            { date: new Date('2026-08-19T08:00:00Z'), amount: 1000 },
            { date: new Date('2026-08-19T18:00:00Z'), amount: 500 },
            { date: new Date('2026-08-20T09:00:00Z'), amount: 200 },
        ], 'day');
        expect(buckets).toHaveLength(2);
        expect(buckets[0]).toMatchObject({ period: '2026-08-19' });
        expect(buckets[0].total.toString()).toBe('1500');
        expect(buckets[1]).toMatchObject({ period: '2026-08-20' });
        expect(buckets[1].total.toString()).toBe('200');
    });
    it('buckets by month and sums amounts within the same month', () => {
        const buckets = (0, sales_bucketing_1.bucketSales)([
            { date: new Date('2026-08-01T00:00:00Z'), amount: 1000 },
            { date: new Date('2026-08-31T23:00:00Z'), amount: 500 },
            { date: new Date('2026-09-01T00:00:00Z'), amount: 300 },
        ], 'month');
        expect(buckets).toHaveLength(2);
        expect(buckets[0]).toMatchObject({ period: '2026-08' });
        expect(buckets[0].total.toString()).toBe('1500');
        expect(buckets[1]).toMatchObject({ period: '2026-09' });
        expect(buckets[1].total.toString()).toBe('300');
    });
    it('returns buckets sorted chronologically regardless of input order', () => {
        const buckets = (0, sales_bucketing_1.bucketSales)([
            { date: new Date('2026-08-20T00:00:00Z'), amount: 1 },
            { date: new Date('2026-08-18T00:00:00Z'), amount: 1 },
            { date: new Date('2026-08-19T00:00:00Z'), amount: 1 },
        ], 'day');
        expect(buckets.map((b) => b.period)).toEqual(['2026-08-18', '2026-08-19', '2026-08-20']);
    });
    it('returns an empty array for no entries', () => {
        expect((0, sales_bucketing_1.bucketSales)([], 'day')).toEqual([]);
    });
});
//# sourceMappingURL=sales-bucketing.spec.js.map