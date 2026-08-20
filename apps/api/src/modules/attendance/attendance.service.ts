import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { todayDateOnly, dateOnly } from './date-only';
import { CreateAttendanceRecordDto } from './dto/create-attendance-record.dto';
import { UpdateAttendanceRecordDto } from './dto/update-attendance-record.dto';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import { ListOwnAttendanceQueryDto } from './dto/list-own-attendance-query.dto';

const USER_SUMMARY_SELECT = { id: true, name: true } as const;
const RECORD_INCLUDE = {
  user: { select: USER_SUMMARY_SELECT },
  markedBy: { select: USER_SUMMARY_SELECT },
};

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Self-service — no permission gate, same as changeOwnPassword. Idempotent-safe: errors rather than silently no-op-ing a double clock-in. */
  async clockIn(userId: string) {
    const db = this.prisma.forTenant();
    const today = todayDateOnly();
    const existing = await db.attendanceRecord.findFirst({ where: { userId, date: today } });

    if (existing?.checkInAt) {
      throw new BadRequestException('Already clocked in today');
    }

    if (existing) {
      return db.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkInAt: new Date(), status: AttendanceStatus.PRESENT },
      });
    }

    return db.attendanceRecord.create({
      data: {
        userId,
        date: today,
        checkInAt: new Date(),
        status: AttendanceStatus.PRESENT,
      } as unknown as Prisma.AttendanceRecordUncheckedCreateInput,
    });
  }

  async clockOut(userId: string) {
    const db = this.prisma.forTenant();
    const today = todayDateOnly();
    const existing = await db.attendanceRecord.findFirst({ where: { userId, date: today } });

    if (!existing?.checkInAt) {
      throw new BadRequestException('Clock in before clocking out');
    }
    if (existing.checkOutAt) {
      throw new BadRequestException('Already clocked out today');
    }

    return db.attendanceRecord.update({ where: { id: existing.id }, data: { checkOutAt: new Date() } });
  }

  /** Today's own record, or null if not yet clocked in — drives the clock-in/out widget's state. */
  todayStatus(userId: string) {
    return this.prisma.forTenant().attendanceRecord.findFirst({ where: { userId, date: todayDateOnly() } });
  }

  async findOwn(userId: string, query: ListOwnAttendanceQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    const db = this.prisma.forTenant();

    const where = {
      userId,
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: dateOnly(new Date(query.from)) } : {}),
              ...(query.to ? { lte: dateOnly(new Date(query.to)) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.attendanceRecord.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      db.attendanceRecord.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Owner/Manager view across all staff. */
  async findAll(query: ListAttendanceQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: dateOnly(new Date(query.from)) } : {}),
              ...(query.to ? { lte: dateOnly(new Date(query.to)) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.attendanceRecord.findMany({
        where,
        include: RECORD_INCLUDE,
        orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.attendanceRecord.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Admin mark/correct — upserts by (userId, date) rather than erroring on
   * the unique constraint, since re-marking an already-recorded day (fixing
   * a forgotten clock-out, changing PRESENT to ON_LEAVE, ...) is the normal
   * case, not an error. `forTenant()` doesn't extend `upsert` (see
   * prisma.service.ts's TENANT_SCOPED_MODELS comment — only the operations
   * it explicitly lists are scoped), so this is a manual find-then-write
   * instead of a real Prisma upsert.
   */
  async create(dto: CreateAttendanceRecordDto, markedByUserId: string) {
    await this.assertUserExists(dto.userId);
    const db = this.prisma.forTenant();
    const date = dateOnly(new Date(dto.date));

    const existing = await db.attendanceRecord.findFirst({ where: { userId: dto.userId, date } });
    const data = {
      status: dto.status ?? AttendanceStatus.PRESENT,
      checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
      checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
      notes: dto.notes,
      markedByUserId,
    };

    if (existing) {
      return db.attendanceRecord.update({ where: { id: existing.id }, data, include: RECORD_INCLUDE });
    }
    return db.attendanceRecord.create({
      data: { userId: dto.userId, date, ...data } as unknown as Prisma.AttendanceRecordUncheckedCreateInput,
      include: RECORD_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateAttendanceRecordDto, markedByUserId: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().attendanceRecord.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.checkInAt !== undefined ? { checkInAt: new Date(dto.checkInAt) } : {}),
        ...(dto.checkOutAt !== undefined ? { checkOutAt: new Date(dto.checkOutAt) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        markedByUserId,
      },
      include: RECORD_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().attendanceRecord.delete({ where: { id } });
  }

  private async assertExists(id: string) {
    const record = await this.prisma.forTenant().attendanceRecord.findFirst({ where: { id } });
    if (!record) throw new NotFoundException('Attendance record not found');
    return record;
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.forTenant().user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
  }
}
