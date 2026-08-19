"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_inspection_dto_1 = require("../src/modules/inspections/dto/create-inspection.dto");
const create_inspection_item_dto_1 = require("../src/modules/inspections/dto/create-inspection-item.dto");
describe('CreateInspectionDto validation', () => {
    const validVehicleId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_inspection_dto_1.CreateInspectionDto, { vehicleId: validVehicleId });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a missing vehicleId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_inspection_dto_1.CreateInspectionDto, {});
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
    });
    it('rejects a non-UUID appointmentId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_inspection_dto_1.CreateInspectionDto, {
            vehicleId: validVehicleId,
            appointmentId: 'not-a-uuid',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'appointmentId')).toBe(true);
    });
});
describe('CreateInspectionItemDto validation', () => {
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_inspection_item_dto_1.CreateInspectionItemDto, { category: 'EXTERIOR', itemName: 'Cabin Air Filter' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects an invalid category enum value', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_inspection_item_dto_1.CreateInspectionItemDto, { category: 'UNDERBODY', itemName: 'Cabin Air Filter' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'category')).toBe(true);
    });
    it('rejects a missing itemName', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_inspection_item_dto_1.CreateInspectionItemDto, { category: 'EXTERIOR' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'itemName')).toBe(true);
    });
});
//# sourceMappingURL=inspection-dto.spec.js.map