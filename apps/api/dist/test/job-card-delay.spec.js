"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const job_card_delay_1 = require("../src/modules/job-cards/job-card-delay");
const NOW = new Date(2026, 7, 26, 12, 0, 0);
describe('computeJobCardDelayStatus', () => {
    it('is null when there is no expectedDelivery', () => {
        expect((0, job_card_delay_1.computeJobCardDelayStatus)(null, 'IN_PROGRESS', NOW)).toBeNull();
    });
    it('is null once the job card is DELIVERED, even if it was overdue', () => {
        expect((0, job_card_delay_1.computeJobCardDelayStatus)(new Date(2026, 7, 20), 'DELIVERED', NOW)).toBeNull();
    });
    it('is null once CANCELLED', () => {
        expect((0, job_card_delay_1.computeJobCardDelayStatus)(new Date(2026, 7, 20), 'CANCELLED', NOW)).toBeNull();
    });
    it('is DELAYED when expectedDelivery is a past calendar day', () => {
        expect((0, job_card_delay_1.computeJobCardDelayStatus)(new Date(2026, 7, 25, 23, 0), 'IN_PROGRESS', NOW)).toBe('DELAYED');
    });
    it('is DUE_TODAY when expectedDelivery falls on the same calendar day', () => {
        expect((0, job_card_delay_1.computeJobCardDelayStatus)(new Date(2026, 7, 26, 23, 0), 'IN_PROGRESS', NOW)).toBe('DUE_TODAY');
    });
    it('is ON_TRACK when expectedDelivery is a future calendar day', () => {
        expect((0, job_card_delay_1.computeJobCardDelayStatus)(new Date(2026, 7, 28), 'IN_PROGRESS', NOW)).toBe('ON_TRACK');
    });
});
describe('computeJobCardDelayDays', () => {
    it('counts whole calendar days late', () => {
        expect((0, job_card_delay_1.computeJobCardDelayDays)(new Date(2026, 7, 24, 23, 0), NOW)).toBe(2);
    });
    it('never returns negative', () => {
        expect((0, job_card_delay_1.computeJobCardDelayDays)(new Date(2026, 7, 30), NOW)).toBe(0);
    });
});
//# sourceMappingURL=job-card-delay.spec.js.map