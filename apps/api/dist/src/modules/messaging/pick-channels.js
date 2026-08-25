"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickCustomerChannels = pickCustomerChannels;
function pickCustomerChannels(recipient, available, preference) {
    const channels = [];
    if (available.email && preference.email && recipient.email) {
        channels.push('EMAIL');
    }
    if (recipient.mobile) {
        if (available.whatsapp && preference.whatsapp) {
            channels.push('WHATSAPP');
        }
        else if (available.sms && preference.sms) {
            channels.push('SMS');
        }
    }
    return channels;
}
//# sourceMappingURL=pick-channels.js.map