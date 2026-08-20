"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const date_range_query_dto_1 = require("../src/modules/reports/dto/date-range-query.dto");
const sales_report_query_dto_1 = require("../src/modules/reports/dto/sales-report-query.dto");
const invoices_report_query_dto_1 = require("../src/modules/reports/dto/invoices-report-query.dto");
const payments_report_query_dto_1 = require("../src/modules/reports/dto/payments-report-query.dto");
describe('DateRangeQueryDto validation', () => {
    it('accepts an empty payload — every field is optional', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(date_range_query_dto_1.DateRangeQueryDto, {});
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a malformed from date', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(date_range_query_dto_1.DateRangeQueryDto, { from: 'not-a-date' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'from')).toBe(true);
    });
});
describe('SalesReportQueryDto validation', () => {
    it('accepts a valid groupBy', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(sales_report_query_dto_1.SalesReportQueryDto, { groupBy: 'month' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects an invalid groupBy', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(sales_report_query_dto_1.SalesReportQueryDto, { groupBy: 'week' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'groupBy')).toBe(true);
    });
    it('still validates the inherited from/to fields', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(sales_report_query_dto_1.SalesReportQueryDto, { from: 'not-a-date' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'from')).toBe(true);
    });
});
describe('InvoicesReportQueryDto validation', () => {
    it('rejects an invalid status', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(invoices_report_query_dto_1.InvoicesReportQueryDto, { status: 'OVERDUE' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'status')).toBe(true);
    });
    it('accepts a valid status', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(invoices_report_query_dto_1.InvoicesReportQueryDto, { status: 'PAID' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
});
describe('PaymentsReportQueryDto validation', () => {
    it('rejects an invalid method', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(payments_report_query_dto_1.PaymentsReportQueryDto, { method: 'cheque' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'method')).toBe(true);
    });
    it('accepts a valid method', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(payments_report_query_dto_1.PaymentsReportQueryDto, { method: 'upi' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
});
//# sourceMappingURL=report-query-dto.spec.js.map