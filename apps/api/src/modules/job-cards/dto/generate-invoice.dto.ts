import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GenerateInvoiceDto {
  @ApiPropertyOptional({ description: 'Loyalty points to redeem as a pre-tax discount on this invoice — rejected if it exceeds the customer\'s balance or the invoice\'s own subtotal' })
  @IsOptional()
  @IsInt()
  @Min(1)
  redeemLoyaltyPoints?: number;
}
