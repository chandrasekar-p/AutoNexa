import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsDateString, IsIn, IsOptional } from 'class-validator';

export class ExportGstQueryDto {
  @ApiProperty({ description: 'Period start (inclusive)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Period end (inclusive)' })
  @IsDateString()
  to!: string;

  @ApiProperty({ enum: ['tally-xml', 'gstr-csv'] })
  @IsIn(['tally-xml', 'gstr-csv'])
  format!: 'tally-xml' | 'gstr-csv';

  @ApiProperty({ enum: ['sales', 'purchases'] })
  @IsIn(['sales', 'purchases'])
  side!: 'sales' | 'purchases';

  @ApiPropertyOptional({ description: 'When true, returns JSON totals/warnings instead of the file, and does not record a GstExportBatch' })
  @IsOptional()
  @IsBooleanString()
  preview?: string;
}
