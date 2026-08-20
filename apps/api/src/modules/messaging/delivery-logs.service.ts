import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ListDeliveryLogsQueryDto } from './dto/list-delivery-logs-query.dto';

@Injectable()
export class DeliveryLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Read-only visibility into what MessagingService has attempted to send — see messaging.service.ts. */
  async findAll(query: ListDeliveryLogsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.event ? { event: { contains: query.event, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      db.deliveryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.deliveryLog.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
