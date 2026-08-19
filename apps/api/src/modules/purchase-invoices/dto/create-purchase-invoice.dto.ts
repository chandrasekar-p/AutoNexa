import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

// subtotal/taxAmount/total are client-supplied here, not server-computed
// from PurchaseOrderItems — this records what the supplier's own invoice
// document actually says (an external fact), which can legitimately differ
// slightly from the PO's own line totals (rounding, extra charges). This
// is a deliberate contrast with Estimate, where WE control and compute the
// total end-to-end.
export class CreatePurchaseInvoiceDto {
  @ApiProperty()
  @IsUUID()
  purchaseOrderId: string;

  @ApiProperty({ description: "The supplier's own invoice number, not ours" })
  @IsString()
  @IsNotEmpty()
  supplierInvoiceNumber: string;

  @ApiProperty()
  @IsDateString()
  invoiceDate: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  total: number;
}
