"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDisplayUrl = resolveDisplayUrl;
const CACHE_TTL_MS = 10 * 60 * 1000;
const urlCache = new Map();
async function resolveDisplayUrl(storage, key) {
    if (!key)
        return null;
    const cached = urlCache.get(key);
    if (cached && cached.expiresAt > Date.now())
        return cached.url;
    const url = await storage.getSignedUrl(key);
    urlCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
    return url;
}
//# sourceMappingURL=resolve-display-url.js.map