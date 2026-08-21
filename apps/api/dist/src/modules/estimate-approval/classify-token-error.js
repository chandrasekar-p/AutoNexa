"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyTokenVerificationError = classifyTokenVerificationError;
function classifyTokenVerificationError(errorName) {
    return errorName === 'TokenExpiredError' ? 'expired' : 'invalid';
}
//# sourceMappingURL=classify-token-error.js.map