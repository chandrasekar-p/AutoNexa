"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDisplayUrl = resolveDisplayUrl;
function resolveDisplayUrl(storage, key) {
    if (!key)
        return Promise.resolve(null);
    return storage.getSignedUrl(key);
}
//# sourceMappingURL=resolve-display-url.js.map