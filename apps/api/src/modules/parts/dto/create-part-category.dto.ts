import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePartCategoryDto {
  @ApiProperty({ example: 'Brakes' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
