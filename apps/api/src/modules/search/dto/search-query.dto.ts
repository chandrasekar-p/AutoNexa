import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ description: 'Free-text query — customer name/mobile, registration no, VIN, job-card no, invoice no, or part no/SKU' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  q: string;
}
