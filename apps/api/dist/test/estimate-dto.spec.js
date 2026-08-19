"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_estimate_dto_1 = require("../src/modules/estimates/dto/create-estimate.dto");
const create_estimate_line_item_dto_1 = require("../src/modules/estimates/dto/create-estimate-line-item.dto");
describe('CreateEstimateDto validation', () => {
    const validCustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const validVehicleId = '3fa85f64-5717-4562-b3fc-2c963f66afa7';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_estimate_dto_1.CreateEstimateDto, {
            customerId: validCustomerId,
            vehicleId: validVehicleId,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a non-UUID customerId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_estimate_dto_1.CreateEstimateDto, {
            customerId: 'not-a-uuid',
            vehicleId: validVehicleId,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'customerId')).toBe(true);
    });
    it('rejects a negative discountAmount', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_estimate_dto_1.CreateEstimateDto, {
            customerId: validCustomerId,
            vehicleId: validVehicleId,
            discountAmount: -50,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'discountAmount')).toBe(true);
    });
    it('validates nested lineItems and rejects an invalid one', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_estimate_dto_1.CreateEstimateDto, {
            customerId: validCustomerId,
            vehicleId: validVehicleId,
            lineItems: [{ itemType: 'LABOUR', description: 'Wheel alignment', unitPrice: -100 }],
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'lineItems')).toBe(true);
    });
    it('accepts valid nested lineItems', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_estimate_dto_1.CreateEstimateDto, {
            customerId: validCustomerId,
            vehicleId: validVehicleId,
            lineItems: [{ itemType: 'LABOUR', description: 'Wheel alignment', unitPrice: 500 }],
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
});
describe('CreateEstimateLineItemDto validation', () => {
    it('rejects an invalid itemType enum value', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_estimate_line_item_dto_1.CreateEstimateLineItemDto, {
            itemType: 'FUEL',
            description: 'Petrol top-up',
            unitPrice: 100,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'itemType')).toBe(true);
    });
    it('rejects a missing unitPrice', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_estimate_line_item_dto_1.CreateEstimateLineItemDto, {
            itemType: 'PART',
            description: 'Brake pads',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'unitPrice')).toBe(true);
    });
});
//# sourceMappingURL=estimate-dto.spec.js.map