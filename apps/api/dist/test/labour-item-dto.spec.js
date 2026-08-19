"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_labour_item_dto_1 = require("../src/modules/labour-items/dto/create-labour-item.dto");
describe('CreateLabourItemDto validation', () => {
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_labour_item_dto_1.CreateLabourItemDto, {
            code: 'LBR-001',
            description: 'Front brake pad replacement',
            standardHours: 1.5,
            labourRate: 400,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a missing code', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_labour_item_dto_1.CreateLabourItemDto, {
            description: 'Front brake pad replacement',
            standardHours: 1.5,
            labourRate: 400,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'code')).toBe(true);
    });
    it('rejects a zero standardHours', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_labour_item_dto_1.CreateLabourItemDto, {
            code: 'LBR-001',
            description: 'Front brake pad replacement',
            standardHours: 0,
            labourRate: 400,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'standardHours')).toBe(true);
    });
    it('rejects a negative labourRate', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_labour_item_dto_1.CreateLabourItemDto, {
            code: 'LBR-001',
            description: 'Front brake pad replacement',
            standardHours: 1.5,
            labourRate: -50,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'labourRate')).toBe(true);
    });
});
//# sourceMappingURL=labour-item-dto.spec.js.map