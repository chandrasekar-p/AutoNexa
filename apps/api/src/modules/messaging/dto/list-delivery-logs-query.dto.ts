import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DeliveryChannel, DeliveryStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListDeliveryLogsQueryDto {
  @ApiPropertyOptional({ enum: DeliveryChannel })
  @IsOptional()
  @IsEnum(DeliveryChannel)
  channel?: DeliveryChannel;

  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Event code, e.g. "appointment.confirmed" — partial match' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
