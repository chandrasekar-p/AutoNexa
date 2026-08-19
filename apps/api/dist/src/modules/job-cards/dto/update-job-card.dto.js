"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateJobCardDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_job_card_dto_1 = require("./create-job-card.dto");
class UpdateJobCardDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_job_card_dto_1.CreateJobCardDto, ['vehicleId', 'customerId'])) {
}
exports.UpdateJobCardDto = UpdateJobCardDto;
//# sourceMappingURL=update-job-card.dto.js.map