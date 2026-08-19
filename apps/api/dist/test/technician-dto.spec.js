"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_technician_dto_1 = require("../src/modules/technicians/dto/create-technician.dto");
describe('CreateTechnicianDto validation', () => {
    const validUserId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_technician_dto_1.CreateTechnicianDto, { userId: validUserId });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a non-UUID userId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_technician_dto_1.CreateTechnicianDto, { userId: 'not-a-uuid' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'userId')).toBe(true);
    });
    it('rejects a negative experienceYears', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_technician_dto_1.CreateTechnicianDto, { userId: validUserId, experienceYears: -1 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'experienceYears')).toBe(true);
    });
    it('accepts a skills array', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_technician_dto_1.CreateTechnicianDto, { userId: validUserId, skills: ['engine', 'electrical'] });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a non-string skills entry', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_technician_dto_1.CreateTechnicianDto, { userId: validUserId, skills: ['engine', 42] });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'skills')).toBe(true);
    });
});
//# sourceMappingURL=technician-dto.spec.js.map