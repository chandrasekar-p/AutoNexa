"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePurchaseInvoiceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_purchase_invoice_dto_1 = require("./create-purchase-invoice.dto");
class UpdatePurchaseInvoiceDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_purchase_invoice_dto_1.CreatePurchaseInvoiceDto, ['purchaseOrderId'])) {
}
exports.UpdatePurchaseInvoiceDto = UpdatePurchaseInvoiceDto;
//# sourceMappingURL=update-purchase-invoice.dto.js.map