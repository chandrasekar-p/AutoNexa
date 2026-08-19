"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_purchase_invoice_dto_1 = require("../src/modules/purchase-invoices/dto/create-purchase-invoice.dto");
const create_supplier_payment_dto_1 = require("../src/modules/supplier-payments/dto/create-supplier-payment.dto");
describe('CreatePurchaseInvoiceDto validation', () => {
    const validPoId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_purchase_invoice_dto_1.CreatePurchaseInvoiceDto, {
            purchaseOrderId: validPoId,
            supplierInvoiceNumber: 'SUPP-INV-001',
            invoiceDate: '2026-08-19',
            subtotal: 5000,
            taxAmount: 900,
            total: 5900,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a missing supplierInvoiceNumber', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_purchase_invoice_dto_1.CreatePurchaseInvoiceDto, {
            purchaseOrderId: validPoId,
            invoiceDate: '2026-08-19',
            subtotal: 5000,
            taxAmount: 900,
            total: 5900,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'supplierInvoiceNumber')).toBe(true);
    });
    it('rejects a malformed invoiceDate', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_purchase_invoice_dto_1.CreatePurchaseInvoiceDto, {
            purchaseOrderId: validPoId,
            supplierInvoiceNumber: 'SUPP-INV-001',
            invoiceDate: 'not-a-date',
            subtotal: 5000,
            taxAmount: 900,
            total: 5900,
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'invoiceDate')).toBe(true);
    });
});
describe('CreateSupplierPaymentDto validation', () => {
    const validInvoiceId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    it('accepts a minimal valid payload', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_supplier_payment_dto_1.CreateSupplierPaymentDto, {
            purchaseInvoiceId: validInvoiceId,
            amount: 5900,
            paymentDate: '2026-08-19',
            method: 'bank_transfer',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
    it('rejects a zero amount', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_supplier_payment_dto_1.CreateSupplierPaymentDto, {
            purchaseInvoiceId: validInvoiceId,
            amount: 0,
            paymentDate: '2026-08-19',
            method: 'bank_transfer',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });
    it('rejects a missing method', async () => {
        const dto = (0, class_transformer_1.plainToInstance)(create_supplier_payment_dto_1.CreateSupplierPaymentDto, {
            purchaseInvoiceId: validInvoiceId,
            amount: 5900,
            paymentDate: '2026-08-19',
        });
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.some((e) => e.property === 'method')).toBe(true);
    });
});
//# sourceMappingURL=purchase-invoice-payment-dto.spec.js.map