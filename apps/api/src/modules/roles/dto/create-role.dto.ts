import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Weekend Service Advisor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [String], description: 'Permission IDs granted to this role' })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
