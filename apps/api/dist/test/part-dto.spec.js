"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_part_dto_1 = require("../src/modules/parts/dto/create-part.dto");
const create_part_category_dto_1 = require("../src/modules/parts/dto/create-part-category.dto");
describe('CreatePartDto validation', () => {
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_part_dto_1.CreatePartDto, {
            partNumber: 'PN-10234',
            sku: 'SKU-BRK-001',
            name: 'Front brake pad set',
            purchasePrice: 800,
            sellingPrice: 1200,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a missing partNumber', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_part_dto_1.CreatePartDto, {
            sku: 'SKU-BRK-001',
            name: 'Front brake pad set',
            purchasePrice: 800,
            sellingPrice: 1200,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'partNumber')).toBe(true);
    });
    it('rejects a negative sellingPrice', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_part_dto_1.CreatePartDto, {
            partNumber: 'PN-10234',
            sku: 'SKU-BRK-001',
            name: 'Front brake pad set',
            purchasePrice: 800,
            sellingPrice: -1,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'sellingPrice')).toBe(true);
    });
    it('rejects a non-UUID categoryId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_part_dto_1.CreatePartDto, {
            partNumber: 'PN-10234',
            sku: 'SKU-BRK-001',
            name: 'Front brake pad set',
            purchasePrice: 800,
            sellingPrice: 1200,
            categoryId: 'not-a-uuid',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'categoryId')).toBe(true);
    });
});
describe('CreatePartCategoryDto validation', () => {
    it('rejects a missing name', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_part_category_dto_1.CreatePartCategoryDto, {});
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'name')).toBe(true);
    });
    it('accepts a valid name', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_part_category_dto_1.CreatePartCategoryDto, { name: 'Brakes' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
});
//# sourceMappingURL=part-dto.spec.js.map