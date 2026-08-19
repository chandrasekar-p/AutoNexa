import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

// unitPrice/gstRate are never client-supplied — they're snapshotted
// server-side from the Part at add time (same discipline as
// CreateJobCardLabourDto / LabourItem).
export class CreateJobCardPartDto {
  @ApiProperty()
  @IsUUID()
  partId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}
