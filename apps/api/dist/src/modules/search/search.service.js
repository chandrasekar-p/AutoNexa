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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const RESULTS_PER_CATEGORY = 5;
function canRead(user, resource) {
    return user.isSuperAdmin || user.permissions.includes(`${resource}:read`);
}
let SearchService = class SearchService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(user, q) {
        const db = this.prisma.forTenant();
        const contains = { contains: q, mode: 'insensitive' };
        const [customers, vehicles, jobCards, invoices, parts] = await Promise.all([
            canRead(user, 'customer')
                ? db.customer.findMany({
                    where: { deletedAt: null, OR: [{ name: contains }, { mobile: contains }, { email: contains }] },
                    select: { id: true, name: true, mobile: true },
                    take: RESULTS_PER_CATEGORY,
                })
                : [],
            canRead(user, 'vehicle')
                ? db.vehicle.findMany({
                    where: { deletedAt: null, OR: [{ registrationNo: contains }, { vin: contains }] },
                    select: { id: true, registrationNo: true, brand: true, model: true },
                    take: RESULTS_PER_CATEGORY,
                })
                : [],
            canRead(user, 'job-card')
                ? db.jobCard.findMany({
                    where: { deletedAt: null, jobCardNumber: contains },
                    select: { id: true, jobCardNumber: true, status: true },
                    take: RESULTS_PER_CATEGORY,
                })
                : [],
            canRead(user, 'invoice')
                ? db.invoice.findMany({
                    where: { invoiceNumber: contains },
                    select: { id: true, invoiceNumber: true, status: true, grandTotal: true },
                    take: RESULTS_PER_CATEGORY,
                })
                : [],
            canRead(user, 'part')
                ? db.part.findMany({
                    where: { deletedAt: null, OR: [{ partNumber: contains }, { sku: contains }, { name: contains }] },
                    select: { id: true, partNumber: true, sku: true, name: true },
                    take: RESULTS_PER_CATEGORY,
                })
                : [],
        ]);
        return { customers, vehicles, jobCards, invoices, parts };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map