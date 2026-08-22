"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffManifest = diffManifest;
exports.manifestsAreEqual = manifestsAreEqual;
const client_1 = require("@prisma/client");
function diffManifest(previousEntries, currentEntries) {
    const previousById = new Map(previousEntries.map((e) => [e.sourceId, e]));
    const amended = [];
    for (const current of currentEntries) {
        const previous = previousById.get(current.sourceId);
        if (!previous)
            continue;
        if (!new client_1.Prisma.Decimal(previous.amount).equals(new client_1.Prisma.Decimal(current.amount))) {
            amended.push({
                sourceId: current.sourceId,
                referenceNumber: current.referenceNumber,
                previousAmount: previous.amount,
                currentAmount: current.amount,
            });
        }
    }
    return amended;
}
function manifestsAreEqual(a, b) {
    if (a.length !== b.length)
        return false;
    const byIdA = new Map(a.map((e) => [e.sourceId, e.amount]));
    return b.every((entry) => {
        const amountA = byIdA.get(entry.sourceId);
        return amountA !== undefined && new client_1.Prisma.Decimal(amountA).equals(new client_1.Prisma.Decimal(entry.amount));
    });
}
//# sourceMappingURL=export-manifest-diff.js.map