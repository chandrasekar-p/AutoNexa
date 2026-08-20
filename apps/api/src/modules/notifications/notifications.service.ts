import { Injectable, NotFoundException } from '@nestjs/common';
import { JobCardStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isLowStock } from '../parts/low-stock';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { AlertsQueryDto } from './dto/alerts-query.dto';

const NON_TERMINAL_JOB_CARD_STATUSES: JobCardStatus[] = Object.values(JobCardStatus).filter(
  (s) => s !== JobCardStatus.DELIVERED && s !== JobCardStatus.CANCELLED,
);

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The requester's own notifications plus broadcast ones (userId: null). */
  async findAll(userId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      OR: [{ userId }, { userId: null }],
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
    };

    const [items, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async markRead(id: string, userId: string) {
    // Restricted to the requester's own + broadcast rows — a plain 404
    // rather than leaking whether some other user's notification exists.
    const notification = await this.prisma.forTenant().notification.findFirst({
      where: { id, OR: [{ userId }, { userId: null }] },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.forTenant().notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.forTenant().notification.updateMany({
      where: { OR: [{ userId }, { userId: null }], isRead: false },
      data: { isRead: true },
    });
    return { markedRead: result.count };
  }

  /**
   * Computed, non-persisted — aggregated fresh on every call, not stored
   * Notification rows. Mirrors the alerts section sketched in the Phase 1
   * dashboard mockup: low-stock parts, vehicles with insurance/PUC expiring
   * soon, and job cards running past their expected delivery.
   */
  async getAlerts(query: AlertsQueryDto) {
    const days = query.days ?? 30;
    const db = this.prisma.forTenant();
    const now = new Date();
    const expiryHorizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const [parts, expiringVehicles, delayedJobCards] = await Promise.all([
      db.part.findMany({ where: { deletedAt: null, isActive: true } }),
      db.vehicle.findMany({
        where: {
          deletedAt: null,
          OR: [
            { insuranceExpiry: { gte: now, lte: expiryHorizon } },
            { pucExpiry: { gte: now, lte: expiryHorizon } },
          ],
        },
        include: { customer: { select: { id: true, name: true, mobile: true } } },
      }),
      db.jobCard.findMany({
        where: {
          deletedAt: null,
          expectedDelivery: { lt: now },
          status: { in: NON_TERMINAL_JOB_CARD_STATUSES },
        },
        include: {
          vehicle: { select: { id: true, registrationNo: true, brand: true, model: true } },
          customer: { select: { id: true, name: true, mobile: true } },
        },
      }),
    ]);

    return {
      lowStockParts: parts.filter(isLowStock),
      expiringDocuments: expiringVehicles.map((v) => ({
        vehicleId: v.id,
        registrationNo: v.registrationNo,
        customer: v.customer,
        insuranceExpiry: v.insuranceExpiry,
        pucExpiry: v.pucExpiry,
      })),
      delayedJobCards: delayedJobCards.map((jc) => ({
        jobCardId: jc.id,
        jobCardNumber: jc.jobCardNumber,
        vehicle: jc.vehicle,
        customer: jc.customer,
        status: jc.status,
        expectedDelivery: jc.expectedDelivery,
      })),
    };
  }
}
