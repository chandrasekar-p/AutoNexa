"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateVehicleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_vehicle_dto_1 = require("./create-vehicle.dto");
class UpdateVehicleDto extends (0, swagger_1.PartialType)((0, swagger_1.OmitType)(create_vehicle_dto_1.CreateVehicleDto, ['customerId'])) {
}
exports.UpdateVehicleDto = UpdateVehicleDto;
//# sourceMappingURL=update-vehicle.dto.js.map