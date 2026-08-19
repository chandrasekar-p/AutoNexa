"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSequenceNumber = formatSequenceNumber;
exports.generateSequenceNumber = generateSequenceNumber;
function formatSequenceNumber(prefix, number, padLength = 4) {
    return `${prefix}-${String(number).padStart(padLength, '0')}`;
}
async function generateSequenceNumber(tx, tenantId, entityType, prefix, padLength = 4) {
    const seq = await tx.tenantSequence.upsert({
        where: { tenantId_entityType: { tenantId, entityType } },
        update: { lastNumber: { increment: 1 } },
        create: { tenantId, entityType, lastNumber: 1 },
    });
    return formatSequenceNumber(prefix, seq.lastNumber, padLength);
}
//# sourceMappingURL=generate-sequence-number.js.map