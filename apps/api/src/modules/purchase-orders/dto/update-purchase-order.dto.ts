import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

// Supplier isn't reassigned via a plain update (same rule as Vehicle ->
// Customer); items are fixed at PO creation — no add/edit/remove-item
// endpoints exist, only the receive flow (POST :id/receive) mutates
// quantityReceived. `status` here is for manual DRAFT/SENT/CANCELLED
// transitions only — PARTIALLY_RECEIVED/RECEIVED are set exclusively by
// the receive flow and rejected here (see purchase-orders.service.ts).
export class UpdatePurchaseOrderDto extends PartialType(
  OmitType(CreatePurchaseOrderDto, ['supplierId', 'items'] as const),
) {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;
}
