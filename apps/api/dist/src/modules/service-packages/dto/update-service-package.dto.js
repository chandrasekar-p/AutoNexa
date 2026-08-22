"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateServicePackageDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_service_package_dto_1 = require("./create-service-package.dto");
class UpdateServicePackageDto extends (0, swagger_1.PartialType)(create_service_package_dto_1.CreateServicePackageDto) {
}
exports.UpdateServicePackageDto = UpdateServicePackageDto;
//# sourceMappingURL=update-service-package.dto.js.map