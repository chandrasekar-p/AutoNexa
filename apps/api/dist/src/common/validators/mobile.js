"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVALID_MOBILE_MESSAGE = exports.INDIAN_MOBILE_REGEX = void 0;
exports.toE164 = toE164;
exports.INDIAN_MOBILE_REGEX = /^(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}$/;
exports.INVALID_MOBILE_MESSAGE = 'Enter a valid 10-digit mobile number';
function toE164(mobile) {
    const digits = mobile.replace(/[\s-]/g, '');
    const match = /^(?:\+91|0)?([6-9]\d{9})$/.exec(digits);
    return match ? `+91${match[1]}` : mobile;
}
//# sourceMappingURL=mobile.js.map