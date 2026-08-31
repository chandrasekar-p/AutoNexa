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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attendance_service_1 = require("./attendance.service");
const create_attendance_record_dto_1 = require("./dto/create-attendance-record.dto");
const update_attendance_record_dto_1 = require("./dto/update-attendance-record.dto");
const list_attendance_query_dto_1 = require("./dto/list-attendance-query.dto");
const list_own_attendance_query_dto_1 = require("./dto/list-own-attendance-query.dto");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const audit_log_interceptor_1 = require("../../common/interceptors/audit-log.interceptor");
let AttendanceController = class AttendanceController {
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    clockIn(user) {
        return this.attendanceService.clockIn(user.userId);
    }
    clockOut(user) {
        return this.attendanceService.clockOut(user.userId);
    }
    findOwn(user, query) {
        return this.attendanceService.findOwn(user.userId, query);
    }
    todayStatus(user) {
        return this.attendanceService.todayStatus(user.userId);
    }
    findAll(query) {
        return this.attendanceService.findAll(query);
    }
    summary(date) {
        return this.attendanceService.summary(date);
    }
    create(dto, user) {
        return this.attendanceService.create(dto, user.userId);
    }
    update(id, dto, user) {
        return this.attendanceService.update(id, dto, user.userId);
    }
    remove(id) {
        return this.attendanceService.remove(id);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('clock-in'),
    (0, audit_log_interceptor_1.Audit)('attendance.clock-in', 'AttendanceRecord'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "clockIn", null);
__decorate([
    (0, common_1.Post)('clock-out'),
    (0, audit_log_interceptor_1.Audit)('attendance.clock-out', 'AttendanceRecord'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "clockOut", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_own_attendance_query_dto_1.ListOwnAttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "findOwn", null);
__decorate([
    (0, common_1.Get)('me/today'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "todayStatus", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_attendance_query_dto_1.ListAttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "findAll", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "summary", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('attendance:create'),
    (0, common_1.Post)(),
    (0, audit_log_interceptor_1.Audit)('attendance.mark', 'AttendanceRecord'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_attendance_record_dto_1.CreateAttendanceRecordDto, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "create", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('attendance:update'),
    (0, common_1.Patch)(':id'),
    (0, audit_log_interceptor_1.Audit)('attendance.correct', 'AttendanceRecord'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_attendance_record_dto_1.UpdateAttendanceRecordDto, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "update", null);
__decorate([
    (0, permissions_decorator_1.Permissions)('attendance:delete'),
    (0, common_1.Delete)(':id'),
    (0, audit_log_interceptor_1.Audit)('attendance.delete', 'AttendanceRecord'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "remove", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiTags)('attendance'),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map