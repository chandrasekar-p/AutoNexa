"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveConvertedLabourLine = resolveConvertedLabourLine;
function resolveConvertedLabourLine(line, matchedLabourItem) {
    return {
        labourItemId: matchedLabourItem?.id,
        rate: line.unitPrice,
        gstRate: line.gstRate,
    };
}
//# sourceMappingURL=resolve-converted-labour-line.js.map