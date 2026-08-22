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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const export_service_1 = require("./export.service");
const export_gst_query_dto_1 = require("./dto/export-gst-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let ExportController = class ExportController {
    constructor(exportService) {
        this.exportService = exportService;
    }
    async exportGst(query, user, res) {
        const result = await this.exportService.exportGst(query, user.userId);
        if (query.preview === 'true') {
            return { warnings: result.warnings, amended: result.amended, supersedesBatchNumber: result.supersedesBatchNumber, ...JSON.parse(result.content) };
        }
        res.set({
            'X-Export-Batch-Number': result.batchNumber ?? '',
            'X-Export-Supersedes-Batch': result.supersedesBatchNumber ?? '',
            'X-Export-Warning-Count': String(result.warnings.length),
            'X-Export-Amended-Count': String(result.amended.length),
        });
        return new common_1.StreamableFile(Buffer.from(result.content, 'utf-8'), {
            type: result.contentType,
            disposition: `attachment; filename="${result.filename}"`,
        });
    }
};
exports.ExportController = ExportController;
__decorate([
    (0, common_1.Get)('gst'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [export_gst_query_dto_1.ExportGstQueryDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "exportGst", null);
exports.ExportController = ExportController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('export'),
    (0, common_1.Controller)('reports/export'),
    (0, permissions_decorator_1.Permissions)('gst-export:read'),
    __metadata("design:paramtypes", [export_service_1.ExportService])
], ExportController);
//# sourceMappingURL=export.controller.js.map