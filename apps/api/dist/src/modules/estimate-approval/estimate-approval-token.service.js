"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimateApprovalTokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const TOKEN_PURPOSE = 'estimate-approval';
let EstimateApprovalTokenService = class EstimateApprovalTokenService {
    constructor(jwt, config) {
        this.jwt = jwt;
        this.config = config;
    }
    sign(payload) {
        return this.jwt.sign({ ...payload, purpose: TOKEN_PURPOSE });
    }
    verify(token) {
        const decoded = this.jwt.verify(token);
        return { estimateId: decoded.estimateId, tenantId: decoded.tenantId };
    }
    decodeExpired(token) {
        const decoded = this.jwt.decode(token);
        if (!decoded?.estimateId || !decoded?.tenantId || decoded.purpose !== TOKEN_PURPOSE)
            return null;
        return { estimateId: decoded.estimateId, tenantId: decoded.tenantId };
    }
    buildUrl(token) {
        const frontendUrl = this.config.get('frontendUrl');
        return frontendUrl ? `${frontendUrl}/estimates/approve/${token}` : `/estimates/approve/${token}`;
    }
};
exports.EstimateApprovalTokenService = EstimateApprovalTokenService;
exports.EstimateApprovalTokenService = EstimateApprovalTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], EstimateApprovalTokenService);
//# sourceMappingURL=estimate-approval-token.service.js.map