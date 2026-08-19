"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_invoice_payment_dto_1 = require("../src/modules/invoices/dto/create-invoice-payment.dto");
describe('CreateInvoicePaymentDto validation', () => {
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_invoice_payment_dto_1.CreateInvoicePaymentDto, { amount: 5000, method: 'upi' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a zero amount', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_invoice_payment_dto_1.CreateInvoicePaymentDto, { amount: 0, method: 'upi' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });
    it('rejects an invalid method', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_invoice_payment_dto_1.CreateInvoicePaymentDto, { amount: 5000, method: 'cheque' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'method')).toBe(true);
    });
    it('rejects a malformed paymentDate when provided', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_invoice_payment_dto_1.CreateInvoicePaymentDto, { amount: 5000, method: 'cash', paymentDate: 'not-a-date' });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'paymentDate')).toBe(true);
    });
    it('accepts every documented payment method', async () => {
        for (const method of ['cash', 'upi', 'card', 'bank_transfer', 'credit']) {
            const dto = (0, class_transformer_1.plainToInstance)(create_invoice_payment_dto_1.CreateInvoicePaymentDto, { amount: 100, method });
            const errors = await (0, class_validator_1.validate)(dto);
            expect(errors).toHaveLength(0);
        }
    });
});
//# sourceMappingURL=invoice-payment-dto.spec.js.map