"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePartDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_part_dto_1 = require("./create-part.dto");
class UpdatePartDto extends (0, swagger_1.PartialType)(create_part_dto_1.CreatePartDto) {
}
exports.UpdatePartDto = UpdatePartDto;
//# sourceMappingURL=update-part.dto.js.map