"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inspection_display_status_1 = require("../src/modules/inspections/inspection-display-status");
const NOW = new Date('2026-08-26T12:00:00.000Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 60 * 60 * 1000);
describe('computeInspectionDisplayStatus', () => {
    it('is COMPLETED whenever the stored status is COMPLETED, regardless of age or items', () => {
        expect((0, inspection_display_status_1.computeInspectionDisplayStatus)({ status: 'COMPLETED', createdAt: hoursAgo(100), items: [{ result: 'NOT_CHECKED' }] }, NOW)).toBe('COMPLETED');
    });
    it('is OVERDUE once an IN_PROGRESS inspection has been open more than 24h, even with items still unchecked', () => {
        expect((0, inspection_display_status_1.computeInspectionDisplayStatus)({ status: 'IN_PROGRESS', createdAt: hoursAgo(25), items: [{ result: 'NOT_CHECKED' }] }, NOW)).toBe('OVERDUE');
    });
    it('is PENDING_REVIEW when every item has a result but the inspection is still IN_PROGRESS and within the window', () => {
        expect((0, inspection_display_status_1.computeInspectionDisplayStatus)({ status: 'IN_PROGRESS', createdAt: hoursAgo(2), items: [{ result: 'PASS' }, { result: 'FAIL' }] }, NOW)).toBe('PENDING_REVIEW');
    });
    it('is IN_PROGRESS when at least one item is still NOT_CHECKED and within the window', () => {
        expect((0, inspection_display_status_1.computeInspectionDisplayStatus)({ status: 'IN_PROGRESS', createdAt: hoursAgo(2), items: [{ result: 'PASS' }, { result: 'NOT_CHECKED' }] }, NOW)).toBe('IN_PROGRESS');
    });
    it('treats a brand-new inspection with zero items as IN_PROGRESS, not PENDING_REVIEW', () => {
        expect((0, inspection_display_status_1.computeInspectionDisplayStatus)({ status: 'IN_PROGRESS', createdAt: hoursAgo(0), items: [] }, NOW)).toBe('IN_PROGRESS');
    });
    it('is exactly at the boundary: 24h0s old counts as OVERDUE, 23h59m59s does not', () => {
        expect((0, inspection_display_status_1.computeInspectionDisplayStatus)({ status: 'IN_PROGRESS', createdAt: hoursAgo(24), items: [] }, NOW)).toBe('OVERDUE');
        expect((0, inspection_display_status_1.computeInspectionDisplayStatus)({ status: 'IN_PROGRESS', createdAt: new Date(hoursAgo(24).getTime() + 1000), items: [] }, NOW)).toBe('IN_PROGRESS');
    });
});
describe('computeInspectionDurationMinutes', () => {
    it('measures from createdAt to completedAt when completed', () => {
        const createdAt = new Date('2026-08-26T10:00:00.000Z');
        const completedAt = new Date('2026-08-26T10:25:00.000Z');
        expect((0, inspection_display_status_1.computeInspectionDurationMinutes)(createdAt, completedAt, NOW)).toBe(25);
    });
    it('measures from createdAt to now when still open, ignoring how much later `now` is', () => {
        expect((0, inspection_display_status_1.computeInspectionDurationMinutes)(hoursAgo(1), null, NOW)).toBe(60);
    });
    it('never returns a negative duration', () => {
        expect((0, inspection_display_status_1.computeInspectionDurationMinutes)(new Date(NOW.getTime() + 60000), null, NOW)).toBe(0);
    });
});
describe('inspectionDisplayStatusWhere', () => {
    it('produces a plain status filter for COMPLETED', () => {
        expect((0, inspection_display_status_1.inspectionDisplayStatusWhere)('COMPLETED', NOW)).toEqual({ status: 'COMPLETED' });
    });
    it('produces an IN_PROGRESS + createdAt-at-or-before-cutoff filter for OVERDUE', () => {
        const where = (0, inspection_display_status_1.inspectionDisplayStatusWhere)('OVERDUE', NOW);
        expect(where.status).toBe('IN_PROGRESS');
        expect(where.createdAt.lte.getTime()).toBe(NOW.getTime() - 24 * 60 * 60 * 1000);
    });
});
//# sourceMappingURL=inspection-display-status.spec.js.map