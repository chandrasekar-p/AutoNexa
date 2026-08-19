"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_purchase_order_dto_1 = require("../src/modules/purchase-orders/dto/create-purchase-order.dto");
const receive_goods_dto_1 = require("../src/modules/purchase-orders/dto/receive-goods.dto");
describe('CreatePurchaseOrderDto validation', () => {
    const validSupplierId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const validPartId = '3fa85f64-5717-4562-b3fc-2c963f66afa7';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_purchase_order_dto_1.CreatePurchaseOrderDto, {
            supplierId: validSupplierId,
            items: [{ partId: validPartId, quantityOrdered: 10, unitCost: 500, gstRate: 18 }],
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects an empty items array', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_purchase_order_dto_1.CreatePurchaseOrderDto, { supplierId: validSupplierId, items: [] });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'items')).toBe(true);
    });
    it('rejects an invalid nested item', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_purchase_order_dto_1.CreatePurchaseOrderDto, {
            supplierId: validSupplierId,
            items: [{ partId: 'not-a-uuid', quantityOrdered: 10, unitCost: 500, gstRate: 18 }],
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'items')).toBe(true);
    });
    it('rejects a zero quantityOrdered', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_purchase_order_dto_1.CreatePurchaseOrderDto, {
            supplierId: validSupplierId,
            items: [{ partId: validPartId, quantityOrdered: 0, unitCost: 500, gstRate: 18 }],
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'items')).toBe(true);
    });
});
describe('ReceiveGoodsDto validation', () => {
    const validItemId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(receive_goods_dto_1.ReceiveGoodsDto, {
            items: [{ purchaseOrderItemId: validItemId, quantityReceived: 5 }],
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects an empty items array', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(receive_goods_dto_1.ReceiveGoodsDto, { items: [] });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'items')).toBe(true);
    });
    it('rejects a zero quantityReceived', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(receive_goods_dto_1.ReceiveGoodsDto, {
            items: [{ purchaseOrderItemId: validItemId, quantityReceived: 0 }],
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'items')).toBe(true);
    });
});
//# sourceMappingURL=purchase-order-dto.spec.js.map