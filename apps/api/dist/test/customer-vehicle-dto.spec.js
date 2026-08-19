"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_customer_dto_1 = require("../src/modules/customers/dto/create-customer.dto");
const create_vehicle_dto_1 = require("../src/modules/vehicles/dto/create-vehicle.dto");
describe('CreateCustomerDto validation', () => {
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_customer_dto_1.CreateCustomerDto, { name: 'Ravi Kumar', mobile: '9876543210' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a missing name', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_customer_dto_1.CreateCustomerDto, { mobile: '9876543210' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'name')).toBe(true);
    });
    it('rejects an invalid customerType', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_customer_dto_1.CreateCustomerDto, {
            name: 'Acme Fleet',
            mobile: '9876543210',
            customerType: 'nonprofit',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'customerType')).toBe(true);
    });
    it('rejects a malformed email when provided', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_customer_dto_1.CreateCustomerDto, {
            name: 'Ravi Kumar',
            mobile: '9876543210',
            email: 'not-an-email',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
});
describe('CreateVehicleDto validation', () => {
    const validCustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_vehicle_dto_1.CreateVehicleDto, {
            customerId: validCustomerId,
            registrationNo: 'TN 37 AB 1234',
            brand: 'BMW',
            model: 'X5',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a non-UUID customerId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_vehicle_dto_1.CreateVehicleDto, {
            customerId: 'not-a-uuid',
            registrationNo: 'TN 37 AB 1234',
            brand: 'BMW',
            model: 'X5',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'customerId')).toBe(true);
    });
    it('rejects an invalid fuelType enum value', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_vehicle_dto_1.CreateVehicleDto, {
            customerId: validCustomerId,
            registrationNo: 'TN 37 AB 1234',
            brand: 'BMW',
            model: 'X5',
            fuelType: 'coal',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'fuelType')).toBe(true);
    });
    it('rejects a manufactureYear before 1980', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_vehicle_dto_1.CreateVehicleDto, {
            customerId: validCustomerId,
            registrationNo: 'TN 37 AB 1234',
            brand: 'BMW',
            model: 'X5',
            manufactureYear: 1920,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'manufactureYear')).toBe(true);
    });
});
//# sourceMappingURL=customer-vehicle-dto.spec.js.map