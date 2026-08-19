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
exports.PartCategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PartCategoriesService = class PartCategoriesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(dto) {
        return this.prisma.forTenant().partCategory.create({
            data: dto,
        });
    }
    findAll() {
        return this.prisma.forTenant().partCategory.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().partCategory.update({ where: { id }, data: dto });
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().partCategory.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async assertExists(id) {
        const category = await this.prisma.forTenant().partCategory.findFirst({ where: { id, deletedAt: null } });
        if (!category)
            throw new common_1.NotFoundException('Part category not found');
        return category;
    }
};
exports.PartCategoriesService = PartCategoriesService;
exports.PartCategoriesService = PartCategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PartCategoriesService);
//# sourceMappingURL=part-categories.service.js.map