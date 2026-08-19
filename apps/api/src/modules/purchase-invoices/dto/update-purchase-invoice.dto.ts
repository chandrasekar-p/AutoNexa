import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePurchaseInvoiceDto } from './create-purchase-invoice.dto';

// purchaseOrderId isn't reassigned via a plain update — same rule as
// Vehicle → Customer. `status` isn't here at all: it's always recomputed
// from payments (see purchase-invoice-status.ts), never set directly.
export class UpdatePurchaseInvoiceDto extends PartialType(
  OmitType(CreatePurchaseInvoiceDto, ['purchaseOrderId'] as const),
) {}
