"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reminder_eligibility_1 = require("../src/modules/messaging/reminder-eligibility");
describe('buildDateDedupeKey', () => {
    it('is stable for the same vehicle/field/date/threshold', () => {
        const date = new Date('2027-03-15T10:00:00.000Z');
        expect((0, reminder_eligibility_1.buildDateDedupeKey)('v1', 'insuranceExpiry', date, 30)).toBe((0, reminder_eligibility_1.buildDateDedupeKey)('v1', 'insuranceExpiry', date, 30));
    });
    it('changes when the date changes (e.g. after a renewal)', () => {
        const key1 = (0, reminder_eligibility_1.buildDateDedupeKey)('v1', 'insuranceExpiry', new Date('2027-03-15'), 30);
        const key2 = (0, reminder_eligibility_1.buildDateDedupeKey)('v1', 'insuranceExpiry', new Date('2028-03-15'), 30);
        expect(key1).not.toBe(key2);
    });
    it('changes when the threshold changes', () => {
        const date = new Date('2027-03-15');
        expect((0, reminder_eligibility_1.buildDateDedupeKey)('v1', 'insuranceExpiry', date, 30)).not.toBe((0, reminder_eligibility_1.buildDateDedupeKey)('v1', 'insuranceExpiry', date, 15));
    });
});
describe('buildOdometerDedupeKey', () => {
    it('changes once a new service resets the baseline odometer', () => {
        expect((0, reminder_eligibility_1.buildOdometerDedupeKey)('v1', 40000)).not.toBe((0, reminder_eligibility_1.buildOdometerDedupeKey)('v1', 45000));
    });
});
describe('shouldSendDateReminder', () => {
    const now = new Date('2027-02-15T00:00:00.000Z');
    it('fires once the target date falls within the threshold window', () => {
        const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
            optedOut: false,
            enabled: true,
            now,
            targetDate: new Date('2027-03-10T00:00:00.000Z'),
            thresholdDays: 30,
            alreadySent: false,
        });
        expect(eligible).toBe(true);
    });
    it('does not fire before the threshold window is reached', () => {
        const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
            optedOut: false,
            enabled: true,
            now,
            targetDate: new Date('2027-06-01T00:00:00.000Z'),
            thresholdDays: 30,
            alreadySent: false,
        });
        expect(eligible).toBe(false);
    });
    it('does not fire again once already sent for this threshold', () => {
        const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
            optedOut: false,
            enabled: true,
            now,
            targetDate: new Date('2027-03-10T00:00:00.000Z'),
            thresholdDays: 30,
            alreadySent: true,
        });
        expect(eligible).toBe(false);
    });
    it('never fires when the customer has opted out', () => {
        const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
            optedOut: true,
            enabled: true,
            now,
            targetDate: new Date('2027-03-10T00:00:00.000Z'),
            thresholdDays: 30,
            alreadySent: false,
        });
        expect(eligible).toBe(false);
    });
    it('never fires when the tenant has disabled this reminder type', () => {
        const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
            optedOut: false,
            enabled: false,
            now,
            targetDate: new Date('2027-03-10T00:00:00.000Z'),
            thresholdDays: 30,
            alreadySent: false,
        });
        expect(eligible).toBe(false);
    });
    it('does not fire for an already-past date', () => {
        const eligible = (0, reminder_eligibility_1.shouldSendDateReminder)({
            optedOut: false,
            enabled: true,
            now,
            targetDate: new Date('2027-01-01T00:00:00.000Z'),
            thresholdDays: 30,
            alreadySent: false,
        });
        expect(eligible).toBe(false);
    });
});
describe('shouldSendOdometerReminder', () => {
    it('fires once the odometer trigger is true and nothing suppresses it', () => {
        expect((0, reminder_eligibility_1.shouldSendOdometerReminder)({ optedOut: false, enabled: true, dueByOdometer: true, alreadySent: false })).toBe(true);
    });
    it('does not fire before the odometer trigger is true', () => {
        expect((0, reminder_eligibility_1.shouldSendOdometerReminder)({ optedOut: false, enabled: true, dueByOdometer: false, alreadySent: false })).toBe(false);
    });
    it('does not fire again once already sent', () => {
        expect((0, reminder_eligibility_1.shouldSendOdometerReminder)({ optedOut: false, enabled: true, dueByOdometer: true, alreadySent: true })).toBe(false);
    });
    it('never fires when opted out', () => {
        expect((0, reminder_eligibility_1.shouldSendOdometerReminder)({ optedOut: true, enabled: true, dueByOdometer: true, alreadySent: false })).toBe(false);
    });
    it('never fires when the tenant has disabled this reminder type', () => {
        expect((0, reminder_eligibility_1.shouldSendOdometerReminder)({ optedOut: false, enabled: false, dueByOdometer: true, alreadySent: false })).toBe(false);
    });
});
//# sourceMappingURL=reminder-eligibility.spec.js.map