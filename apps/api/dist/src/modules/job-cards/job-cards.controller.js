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
exports.JobCardsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const job_cards_service_1 = require("./job-cards.service");
const create_job_card_dto_1 = require("./dto/create-job-card.dto");
const update_job_card_dto_1 = require("./dto/update-job-card.dto");
const update_job_card_status_dto_1 = require("./dto/update-job-card-status.dto");
const list_job_cards_query_dto_1 = require("./dto/list-job-cards-query.dto");
const create_job_card_labour_dto_1 = require("./dto/create-job-card-labour.dto");
const create_job_card_note_dto_1 = require("./dto/create-job-card-note.dto");
const create_job_card_part_dto_1 = require("./dto/create-job-card-part.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let JobCardsController = class JobCardsController {
    constructor(jobCardsService) {
        this.jobCardsService = jobCardsService;
    }
    create(dto) {
        return this.jobCardsService.create(dto);
    }
    findAll(query, user) {
        return this.jobCardsService.findAll(query, user.userId);
    }
    findOne(id, user) {
        return this.jobCardsService.findOne(id, user.userId);
    }
    update(id, dto, user) {
        return this.jobCardsService.update(id, dto, user.userId);
    }
    updateStatus(id, dto, user) {
        return this.jobCardsService.updateStatus(id, dto, user.userId);
    }
    getStatusHistory(id, user) {
        return this.jobCardsService.getStatusHistory(id, user.userId);
    }
    addLabour(id, dto, user) {
        return this.jobCardsService.addLabour(id, dto, user.userId);
    }
    removeLabour(id, lineId, user) {
        return this.jobCardsService.removeLabour(id, lineId, user.userId);
    }
    addPart(id, dto, user) {
        return this.jobCardsService.addPart(id, dto, user.userId);
    }
    removePart(id, lineId, user) {
        return this.jobCardsService.removePart(id, lineId, user.userId);
    }
    addNote(id, dto, user) {
        return this.jobCardsService.addNote(id, dto, user.userId);
    }
    generateInvoice(id) {
        return this.jobCardsService.generateInvoice(id);
    }
};
exports.JobCardsController = JobCardsController;
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('job-card.create', 'JobCard'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_job_card_dto_1.CreateJobCardDto]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_job_cards_query_dto_1.ListJobCardsQueryDto, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:read'),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "findOne", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('job-card.update', 'JobCard'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_job_card_dto_1.UpdateJobCardDto, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:update'),
    (0, common_1.Patch)(':id/status'),
    (0, audit_log_interceptor_1.Audit)('job-card.status.update', 'JobCard'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_job_card_status_dto_1.UpdateJobCardStatusDto, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "updateStatus", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:read'),
    (0, common_1.Get)(':id/status-history'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "getStatusHistory", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:update'),
    (0, common_1.Post)(':id/labour'),
    (0, audit_log_interceptor_1.Audit)('job-card.labour.add', 'JobCardLabour'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_job_card_labour_dto_1.CreateJobCardLabourDto, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "addLabour", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:update'),
    (0, common_1.Delete)(':id/labour/:lineId'),
    (0, audit_log_interceptor_1.Audit)('job-card.labour.remove', 'JobCardLabour'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('lineId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "removeLabour", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:update'),
    (0, common_1.Post)(':id/parts'),
    (0, audit_log_interceptor_1.Audit)('job-card.part.add', 'JobCardPart'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_job_card_part_dto_1.CreateJobCardPartDto, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "addPart", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:update'),
    (0, common_1.Delete)(':id/parts/:lineId'),
    (0, audit_log_interceptor_1.Audit)('job-card.part.remove', 'JobCardPart'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('lineId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "removePart", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('job-card:update'),
    (0, common_1.Post)(':id/notes'),
    (0, audit_log_interceptor_1.Audit)('job-card.note.add', 'JobCardNote'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_job_card_note_dto_1.CreateJobCardNoteDto, Object]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "addNote", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('invoice:create'),
    (0, common_1.Post)(':id/generate-invoice'),
    (0, audit_log_interceptor_1.Audit)('job-card.generate-invoice', 'Invoice'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobCardsController.prototype, "generateInvoice", null);
exports.JobCardsController = JobCardsController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('job-cards'),
    (0, common_1.Controller)('job-cards'),
    __metadata("design:paramtypes", [job_cards_service_1.JobCardsService])
], JobCardsController);
//# sourceMappingURL=job-cards.controller.js.map