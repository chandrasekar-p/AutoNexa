"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_job_card_part_dto_1 = require("../src/modules/job-cards/dto/create-job-card-part.dto");
describe('CreateJobCardPartDto validation', () => {
    const validPartId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_part_dto_1.CreateJobCardPartDto, { partId: validPartId, quantity: 2 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a non-UUID partId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_part_dto_1.CreateJobCardPartDto, { partId: 'not-a-uuid', quantity: 2 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'partId')).toBe(true);
    });
    it('rejects a zero quantity', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_part_dto_1.CreateJobCardPartDto, { partId: validPartId, quantity: 0 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'quantity')).toBe(true);
    });
});
//# sourceMappingURL=job-card-part-dto.spec.js.map