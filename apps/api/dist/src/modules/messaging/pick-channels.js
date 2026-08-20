"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickCustomerChannels = pickCustomerChannels;
function pickCustomerChannels(recipient, available) {
    const channels = [];
    if (available.email && recipient.email) {
        channels.push('EMAIL');
    }
    if (recipient.mobile) {
        if (available.whatsapp) {
            channels.push('WHATSAPP');
        }
        else if (available.sms) {
            channels.push('SMS');
        }
    }
    return channels;
}
//# sourceMappingURL=pick-channels.js.map