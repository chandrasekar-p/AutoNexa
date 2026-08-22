"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const comeback_rate_1 = require("../src/modules/reports/comeback-rate");
function claim(overrides = {}) {
    return {
        technicianId: null,
        technicianName: null,
        partId: null,
        partName: null,
        supplierId: null,
        supplierName: null,
        ...overrides,
    };
}
describe('aggregateComebackRate', () => {
    it('groups by technician and counts correctly', () => {
        const claims = [
            claim({ technicianId: 't1', technicianName: 'Ravi' }),
            claim({ technicianId: 't1', technicianName: 'Ravi' }),
            claim({ technicianId: 't2', technicianName: 'Suresh' }),
        ];
        const result = (0, comeback_rate_1.aggregateComebackRate)(claims, 'technician');
        expect(result).toEqual([
            { id: 't1', label: 'Ravi', count: 2 },
            { id: 't2', label: 'Suresh', count: 1 },
        ]);
    });
    it('groups by part and counts correctly', () => {
        const claims = [
            claim({ partId: 'p1', partName: 'Brake pad' }),
            claim({ partId: 'p2', partName: 'Oil filter' }),
            claim({ partId: 'p1', partName: 'Brake pad' }),
        ];
        const result = (0, comeback_rate_1.aggregateComebackRate)(claims, 'part');
        expect(result[0]).toEqual({ id: 'p1', label: 'Brake pad', count: 2 });
    });
    it('groups by supplier and counts correctly', () => {
        const claims = [claim({ supplierId: 's1', supplierName: 'Acme Parts' }), claim({ supplierId: 's1', supplierName: 'Acme Parts' })];
        const result = (0, comeback_rate_1.aggregateComebackRate)(claims, 'supplier');
        expect(result).toEqual([{ id: 's1', label: 'Acme Parts', count: 2 }]);
    });
    it('excludes claims with no angle for the requested grouping, rather than bucketing them as Unknown', () => {
        const claims = [claim({ technicianId: 't1', technicianName: 'Ravi' }), claim()];
        expect((0, comeback_rate_1.aggregateComebackRate)(claims, 'part')).toEqual([]);
        expect((0, comeback_rate_1.aggregateComebackRate)(claims, 'technician')).toEqual([{ id: 't1', label: 'Ravi', count: 1 }]);
    });
    it('sorts descending by count', () => {
        const claims = [
            claim({ technicianId: 't1', technicianName: 'Ravi' }),
            claim({ technicianId: 't2', technicianName: 'Suresh' }),
            claim({ technicianId: 't2', technicianName: 'Suresh' }),
            claim({ technicianId: 't2', technicianName: 'Suresh' }),
        ];
        const result = (0, comeback_rate_1.aggregateComebackRate)(claims, 'technician');
        expect(result[0].id).toBe('t2');
        expect(result[0].count).toBe(3);
    });
    it('returns an empty array for no claims', () => {
        expect((0, comeback_rate_1.aggregateComebackRate)([], 'technician')).toEqual([]);
    });
});
//# sourceMappingURL=comeback-rate.spec.js.map