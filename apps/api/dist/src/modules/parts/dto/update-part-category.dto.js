"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePartCategoryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_part_category_dto_1 = require("./create-part-category.dto");
class UpdatePartCategoryDto extends (0, swagger_1.PartialType)(create_part_category_dto_1.CreatePartCategoryDto) {
}
exports.UpdatePartCategoryDto = UpdatePartCategoryDto;
//# sourceMappingURL=update-part-category.dto.js.map