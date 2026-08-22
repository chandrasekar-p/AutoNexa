"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarrantyModule = void 0;
const common_1 = require("@nestjs/common");
const warranty_claims_service_1 = require("./warranty-claims.service");
const warranty_claims_controller_1 = require("./warranty-claims.controller");
let WarrantyModule = class WarrantyModule {
};
exports.WarrantyModule = WarrantyModule;
exports.WarrantyModule = WarrantyModule = __decorate([
    (0, common_1.Module)({
        controllers: [warranty_claims_controller_1.WarrantyClaimsController],
        providers: [warranty_claims_service_1.WarrantyClaimsService],
        exports: [warranty_claims_service_1.WarrantyClaimsService],
    })
], WarrantyModule);
//# sourceMappingURL=warranty.module.js.map