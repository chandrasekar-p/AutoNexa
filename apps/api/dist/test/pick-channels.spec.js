"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pick_channels_1 = require("../src/modules/messaging/pick-channels");
describe('pickCustomerChannels', () => {
    it('returns nothing when no providers are configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: '9876543210' }, { email: false, sms: false, whatsapp: false })).toEqual([]);
    });
    it('skips email when the customer has none, even if email is configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: null, mobile: '9876543210' }, { email: true, sms: false, whatsapp: true })).toEqual(['WHATSAPP']);
    });
    it('skips phone channels when the customer has no mobile', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: null }, { email: true, sms: true, whatsapp: true })).toEqual(['EMAIL']);
    });
    it('prefers WhatsApp over SMS when both are configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: null, mobile: '9876543210' }, { email: false, sms: true, whatsapp: true })).toEqual(['WHATSAPP']);
    });
    it('falls back to SMS when WhatsApp is not configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: null, mobile: '9876543210' }, { email: false, sms: true, whatsapp: false })).toEqual(['SMS']);
    });
    it('returns both email and a phone channel when everything is available', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: '9876543210' }, { email: true, sms: true, whatsapp: true })).toEqual(['EMAIL', 'WHATSAPP']);
    });
});
//# sourceMappingURL=pick-channels.spec.js.map