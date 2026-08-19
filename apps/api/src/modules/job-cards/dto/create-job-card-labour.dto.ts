import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// rate/gstRate are never client-supplied — they're snapshotted server-side
// from the LabourItem at add time (see job-cards.service.ts).
export class CreateJobCardLabourDto {
  @ApiProperty()
  @IsUUID()
  labourItemId: string;

  @ApiPropertyOptional({ description: 'Override display text for this line' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Defaults to the LabourItem\'s standardHours if omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  hours?: number;
}
