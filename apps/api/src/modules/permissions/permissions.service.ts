import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Permissions are global, not tenant-owned — this is the master catalogue
   * used to build role-creation UI (checkbox list grouped by resource).
   */
  findAll() {
    return this.prisma.platform.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }
}
