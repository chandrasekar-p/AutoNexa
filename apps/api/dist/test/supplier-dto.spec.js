"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_supplier_dto_1 = require("../src/modules/suppliers/dto/create-supplier.dto");
describe('CreateSupplierDto validation', () => {
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_supplier_dto_1.CreateSupplierDto, { name: 'Bosch Distributors' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a missing name', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_supplier_dto_1.CreateSupplierDto, {});
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'name')).toBe(true);
    });
    it('rejects a malformed email when provided', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_supplier_dto_1.CreateSupplierDto, { name: 'Bosch Distributors', email: 'not-an-email' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
});
//# sourceMappingURL=supplier-dto.spec.js.map