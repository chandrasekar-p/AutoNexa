"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pick_channels_1 = require("../src/modules/messaging/pick-channels");
const ALL_ENABLED = { email: true, sms: true, whatsapp: true };
describe('pickCustomerChannels', () => {
    it('returns nothing when no providers are configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: '9876543210' }, { email: false, sms: false, whatsapp: false }, ALL_ENABLED)).toEqual([]);
    });
    it('skips email when the customer has none, even if email is configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: null, mobile: '9876543210' }, { email: true, sms: false, whatsapp: true }, ALL_ENABLED)).toEqual(['WHATSAPP']);
    });
    it('skips phone channels when the customer has no mobile', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: null }, { email: true, sms: true, whatsapp: true }, ALL_ENABLED)).toEqual(['EMAIL']);
    });
    it('prefers WhatsApp over SMS when both are configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: null, mobile: '9876543210' }, { email: false, sms: true, whatsapp: true }, ALL_ENABLED)).toEqual(['WHATSAPP']);
    });
    it('falls back to SMS when WhatsApp is not configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: null, mobile: '9876543210' }, { email: false, sms: true, whatsapp: false }, ALL_ENABLED)).toEqual(['SMS']);
    });
    it('returns both email and a phone channel when everything is available', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: '9876543210' }, { email: true, sms: true, whatsapp: true }, ALL_ENABLED)).toEqual(['EMAIL', 'WHATSAPP']);
    });
    it('skips email when configured+available but the workshop has disabled it', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: '9876543210' }, { email: true, sms: true, whatsapp: true }, { email: false, sms: true, whatsapp: true })).toEqual(['WHATSAPP']);
    });
    it('falls back to SMS when WhatsApp is configured but disabled by the workshop', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: null, mobile: '9876543210' }, { email: false, sms: true, whatsapp: true }, { email: true, sms: true, whatsapp: false })).toEqual(['SMS']);
    });
    it('skips the phone channel entirely when both SMS and WhatsApp are disabled by the workshop, even if configured', () => {
        expect((0, pick_channels_1.pickCustomerChannels)({ email: 'a@b.com', mobile: '9876543210' }, { email: true, sms: true, whatsapp: true }, { email: true, sms: false, whatsapp: false })).toEqual(['EMAIL']);
    });
});
//# sourceMappingURL=pick-channels.spec.js.map