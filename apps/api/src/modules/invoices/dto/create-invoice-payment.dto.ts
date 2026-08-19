import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvoicePaymentDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Defaults to now if omitted' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty({ enum: ['cash', 'upi', 'card', 'bank_transfer', 'credit'] })
  @IsIn(['cash', 'upi', 'card', 'bank_transfer', 'credit'])
  method: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
