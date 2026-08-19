"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimatesModule = void 0;
const common_1 = require("@nestjs/common");
const job_cards_module_1 = require("../job-cards/job-cards.module");
const estimates_service_1 = require("./estimates.service");
const estimates_controller_1 = require("./estimates.controller");
let EstimatesModule = class EstimatesModule {
};
exports.EstimatesModule = EstimatesModule;
exports.EstimatesModule = EstimatesModule = __decorate([
    (0, common_1.Module)({
        imports: [job_cards_module_1.JobCardsModule],
        controllers: [estimates_controller_1.EstimatesController],
        providers: [estimates_service_1.EstimatesService],
        exports: [estimates_service_1.EstimatesService],
    })
], EstimatesModule);
//# sourceMappingURL=estimates.module.js.map