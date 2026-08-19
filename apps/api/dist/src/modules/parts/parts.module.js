"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartsModule = void 0;
const common_1 = require("@nestjs/common");
const parts_service_1 = require("./parts.service");
const parts_controller_1 = require("./parts.controller");
const part_categories_service_1 = require("./part-categories.service");
const part_categories_controller_1 = require("./part-categories.controller");
let PartsModule = class PartsModule {
};
exports.PartsModule = PartsModule;
exports.PartsModule = PartsModule = __decorate([
    (0, common_1.Module)({
        controllers: [part_categories_controller_1.PartCategoriesController, parts_controller_1.PartsController],
        providers: [parts_service_1.PartsService, part_categories_service_1.PartCategoriesService],
        exports: [parts_service_1.PartsService, part_categories_service_1.PartCategoriesService],
    })
], PartsModule);
//# sourceMappingURL=parts.module.js.map