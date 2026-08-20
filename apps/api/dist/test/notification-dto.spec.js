"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const list_notifications_query_dto_1 = require("../src/modules/notifications/dto/list-notifications-query.dto");
const alerts_query_dto_1 = require("../src/modules/notifications/dto/alerts-query.dto");
describe('ListNotificationsQueryDto validation', () => {
    it('accepts an empty payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(list_notifications_query_dto_1.ListNotificationsQueryDto, {});
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('coerces isRead from a query string', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(list_notifications_query_dto_1.ListNotificationsQueryDto, { isRead: 'true' });
        expect(dto.isRead).toBe(true);
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a pageSize over 100', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(list_notifications_query_dto_1.ListNotificationsQueryDto, { pageSize: 500 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
    });
});
describe('AlertsQueryDto validation', () => {
    it('defaults days to 30 when omitted', () => {
        const dto = (0, class_transformer_1.plainToInstance)(alerts_query_dto_1.AlertsQueryDto, {});
        expect(dto.days).toBe(30);
    });
    it('rejects a days value over 365', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(alerts_query_dto_1.AlertsQueryDto, { days: 400 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'days')).toBe(true);
    });
    it('rejects a zero days value', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(alerts_query_dto_1.AlertsQueryDto, { days: 0 });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'days')).toBe(true);
    });
});
//# sourceMappingURL=notification-dto.spec.js.map