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
var EstimateApprovalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstimateApprovalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const estimates_service_1 = require("../estimates/estimates.service");
const estimate_approval_token_service_1 = require("./estimate-approval-token.service");
const classify_token_error_1 = require("./classify-token-error");
const CUSTOMER_LINK_SENTINEL_USER_ID = 'system:estimate-approval-link';
const PUBLIC_CUSTOMER_SELECT = { name: true };
const PUBLIC_VEHICLE_SELECT = { registrationNo: true, brand: true, model: true };
let EstimateApprovalService = EstimateApprovalService_1 = class EstimateApprovalService {
    constructor(prisma, approvalToken, estimatesService) {
        this.prisma = prisma;
        this.approvalToken = approvalToken;
        this.estimatesService = estimatesService;
        this.logger = new common_1.Logger(EstimateApprovalService_1.name);
    }
    async getSummary(token, meta) {
        const payload = await this.verifyOrRecordFailure(token, meta);
        return tenant_context_1.TenantContext.run({ tenantId: payload.tenantId, userId: CUSTOMER_LINK_SENTINEL_USER_ID, isSuperAdmin: false }, async () => {
            const estimate = await this.prisma.forTenant().estimate.findFirst({
                where: { id: payload.estimateId, deletedAt: null },
                include: {
                    lineItems: true,
                    customer: { select: PUBLIC_CUSTOMER_SELECT },
                    vehicle: { select: PUBLIC_VEHICLE_SELECT },
                },
            });
            if (!estimate) {
                throw new common_1.NotFoundException('This link is invalid.');
            }
            await this.logEvent(payload.estimateId, 'VIEWED', meta);
            return this.toSummary(estimate);
        });
    }
    async decide(token, decision, meta) {
        const payload = await this.verifyOrRecordFailure(token, meta);
        return tenant_context_1.TenantContext.run({ tenantId: payload.tenantId, userId: CUSTOMER_LINK_SENTINEL_USER_ID, isSuperAdmin: false }, async () => {
            try {
                await this.estimatesService.applyDecision(payload.estimateId, decision, 'customer');
            }
            catch (err) {
                if (err instanceof common_1.BadRequestException) {
                    await this.logEvent(payload.estimateId, 'ALREADY_DECIDED', meta);
                    throw new common_1.BadRequestException('This estimate has already been approved or rejected.');
                }
                throw err;
            }
            await this.logEvent(payload.estimateId, decision, meta);
            const estimate = await this.prisma.forTenant().estimate.findFirstOrThrow({
                where: { id: payload.estimateId },
                include: {
                    lineItems: true,
                    customer: { select: PUBLIC_CUSTOMER_SELECT },
                    vehicle: { select: PUBLIC_VEHICLE_SELECT },
                },
            });
            return this.toSummary(estimate);
        });
    }
    async verifyOrRecordFailure(token, meta) {
        try {
            return this.approvalToken.verify(token);
        }
        catch (err) {
            const errorName = err instanceof Error ? err.name : undefined;
            const outcome = (0, classify_token_error_1.classifyTokenVerificationError)(errorName);
            const recovered = outcome === 'expired' ? this.approvalToken.decodeExpired(token) : null;
            try {
                await this.prisma.platform.estimateApprovalEvent.create({
                    data: {
                        tenantId: recovered?.tenantId ?? null,
                        estimateId: recovered?.estimateId ?? null,
                        action: outcome === 'expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
                        ipAddress: meta.ip ?? null,
                        userAgent: meta.userAgent ?? null,
                    },
                });
            }
            catch (logErr) {
                this.logger.warn(`Failed to record ${outcome} estimate-approval token event: ${String(logErr)}`);
            }
            throw new common_1.NotFoundException(outcome === 'expired'
                ? 'This link has expired. Please contact the workshop for a new one.'
                : 'This link is invalid.');
        }
    }
    async logEvent(estimateId, action, meta) {
        try {
            await this.prisma.forTenant().estimateApprovalEvent.create({
                data: {
                    estimateId,
                    action,
                    ipAddress: meta.ip ?? null,
                    userAgent: meta.userAgent ?? null,
                },
            });
        }
        catch (err) {
            this.logger.warn(`Failed to record ${action} estimate-approval event for ${estimateId}: ${String(err)}`);
        }
    }
    toSummary(estimate) {
        return {
            estimateNumber: `EST-${estimate.id.slice(0, 8).toUpperCase()}`,
            status: estimate.status,
            jobDescription: estimate.jobDescription,
            vehicleLabel: `${estimate.vehicle.registrationNo} ${estimate.vehicle.brand} ${estimate.vehicle.model}`,
            customerName: estimate.customer.name,
            lineItems: estimate.lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice.toString(),
                gstRate: item.gstRate.toString(),
                lineTotal: item.lineTotal.toString(),
            })),
            subtotal: estimate.subtotal.toString(),
            taxAmount: estimate.taxAmount.toString(),
            discountAmount: estimate.discountAmount.toString(),
            total: estimate.total.toString(),
        };
    }
};
exports.EstimateApprovalService = EstimateApprovalService;
exports.EstimateApprovalService = EstimateApprovalService = EstimateApprovalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        estimate_approval_token_service_1.EstimateApprovalTokenService,
        estimates_service_1.EstimatesService])
], EstimateApprovalService);
//# sourceMappingURL=estimate-approval.service.js.map