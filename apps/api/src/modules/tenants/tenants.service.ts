import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { RESOURCES, ACTIONS, DEFAULT_ROLE_GRANTS } from '../roles/default-role-grants';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Platform-level: provisions a brand-new workshop tenant, its default
   * settings row, its full default role set (Workshop Owner, Manager,
   * Service Advisor, Accountant, Inventory Manager, Technician,
   * Receptionist), and its first Workshop Owner user. Super Admin only —
   * enforced by SuperAdminGuard on the controller route, not here.
   */
  async provisionTenant(dto: CreateTenantDto) {
    const existing = await this.prisma.platform.tenant.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already in use`);

    return this.prisma.platform.$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          gstin: dto.gstin,
          settings: { create: {} },
        },
      });

      // Ensure the global permission catalogue exists (idempotent).
      const permissionByKey = new Map<string, string>();
      for (const resource of RESOURCES) {
        for (const action of ACTIONS) {
          const perm = await tx.permission.upsert({
            where: { resource_action: { resource, action } },
            update: {},
            create: { resource, action },
          });
          permissionByKey.set(`${resource}:${action}`, perm.id);
        }
      }

      let ownerRoleId: string | undefined;
      for (const [roleName, grants] of Object.entries(DEFAULT_ROLE_GRANTS)) {
        const role = await tx.role.create({
          data: { tenantId: tenant.id, name: roleName, isSystem: false },
        });
        if (roleName === 'Workshop Owner') ownerRoleId = role.id;

        for (const resource of RESOURCES) {
          const grant = grants[resource];
          if (!grant) continue;
          const actions = grant === '*' ? ACTIONS : grant;
          for (const action of actions) {
            const permId = permissionByKey.get(`${resource}:${action}`);
            if (!permId) continue;
            await tx.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
          }
        }
      }

      const passwordHash = await argon2.hash(dto.ownerPassword);
      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: dto.ownerName,
          email: dto.ownerEmail,
          passwordHash,
        },
      });
      await tx.userRole.create({ data: { userId: owner.id, roleId: ownerRoleId! } });

      return { tenant, ownerId: owner.id };
    });
  }

  async listAll() {
    return this.prisma.platform.tenant.findMany({
      where: { deletedAt: null, NOT: { slug: 'platform' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Self-service: the caller's own tenant, resolved from TenantContext. */
  async getCurrentTenant() {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true, branches: { where: { deletedAt: null } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateSettings(dto: UpdateTenantSettingsDto) {
    const tenantId = TenantContext.requireTenantId();
    return this.prisma.platform.tenantSettings.update({
      where: { tenantId },
      data: dto,
    });
  }
}
