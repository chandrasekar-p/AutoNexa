import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateJobCardNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  note: string;
}
