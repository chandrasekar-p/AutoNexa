"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEstimateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_estimate_dto_1 = require("./create-estimate.dto");
class UpdateEstimateDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_estimate_dto_1.CreateEstimateDto, ['customerId', 'vehicleId', 'lineItems'])) {
}
exports.UpdateEstimateDto = UpdateEstimateDto;
//# sourceMappingURL=update-estimate.dto.js.map