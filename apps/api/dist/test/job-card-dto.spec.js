"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_job_card_dto_1 = require("../src/modules/job-cards/dto/create-job-card.dto");
const create_job_card_labour_dto_1 = require("../src/modules/job-cards/dto/create-job-card-labour.dto");
const create_job_card_note_dto_1 = require("../src/modules/job-cards/dto/create-job-card-note.dto");
const update_job_card_status_dto_1 = require("../src/modules/job-cards/dto/update-job-card-status.dto");
describe('CreateJobCardDto validation', () => {
    const validVehicleId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const validCustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa7';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_dto_1.CreateJobCardDto, {
            vehicleId: validVehicleId,
            customerId: validCustomerId,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a non-UUID vehicleId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_dto_1.CreateJobCardDto, {
            vehicleId: 'not-a-uuid',
            customerId: validCustomerId,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'vehicleId')).toBe(true);
    });
    it('rejects a missing customerId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_dto_1.CreateJobCardDto, { vehicleId: validVehicleId });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'customerId')).toBe(true);
    });
    it('rejects a negative odometer', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_dto_1.CreateJobCardDto, {
            vehicleId: validVehicleId,
            customerId: validCustomerId,
            odometer: -5,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'odometer')).toBe(true);
    });
    it('rejects a malformed expectedDelivery', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_dto_1.CreateJobCardDto, {
            vehicleId: validVehicleId,
            customerId: validCustomerId,
            expectedDelivery: 'not-a-date',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'expectedDelivery')).toBe(true);
    });
});
describe('CreateJobCardLabourDto validation', () => {
    const validLabourItemId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_labour_dto_1.CreateJobCardLabourDto, { labourItemId: validLabourItemId });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a non-UUID labourItemId', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_labour_dto_1.CreateJobCardLabourDto, { labourItemId: 'not-a-uuid' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'labourItemId')).toBe(true);
    });
    it('rejects a zero hours override', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_labour_dto_1.CreateJobCardLabourDto, { labourItemId: validLabourItemId, hours: 0 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'hours')).toBe(true);
    });
});
describe('CreateJobCardNoteDto validation', () => {
    it('rejects an empty note', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_note_dto_1.CreateJobCardNoteDto, { note: '' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'note')).toBe(true);
    });
    it('accepts a non-empty note', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_job_card_note_dto_1.CreateJobCardNoteDto, { note: 'Customer confirmed over phone' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
});
describe('UpdateJobCardStatusDto validation', () => {
    it('rejects an invalid status enum value', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_job_card_status_dto_1.UpdateJobCardStatusDto, { status: 'FINISHED' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'status')).toBe(true);
    });
    it('accepts a valid status', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(update_job_card_status_dto_1.UpdateJobCardStatusDto, { status: 'DIAGNOSIS' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
});
//# sourceMappingURL=job-card-dto.spec.js.map