import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.types';
import { resolveDisplayUrl } from '../storage/resolve-display-url';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { RESOURCES, ACTIONS, DEFAULT_ROLE_GRANTS } from '../roles/default-role-grants';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

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

    const planTier = dto.planTier ?? 'standard';
    const trialEndsAt = planTier === 'trial' ? new Date(Date.now() + (dto.trialDays ?? 14) * 24 * 60 * 60 * 1000) : null;

    return this.prisma.platform.$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          gstin: dto.gstin,
          planTier,
          trialEndsAt,
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

  /** Platform-level: fetch any single tenant by id, for the Super Admin workshop detail page. */
  async findOne(id: string) {
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  /** Platform-level: change plan tier and/or trial end date on an existing tenant (e.g. a trial converting to paid). */
  async updatePlan(id: string, dto: UpdateTenantPlanDto) {
    await this.findOne(id);
    return this.prisma.platform.tenant.update({
      where: { id },
      data: {
        planTier: dto.planTier,
        trialEndsAt: dto.trialEndsAt === undefined ? undefined : dto.trialEndsAt === null ? null : new Date(dto.trialEndsAt),
      },
    });
  }

  /**
   * Deliberately no @Permissions() guard on the controller route for this
   * one — tenant:read (which GET /tenants/me requires) only Workshop Owner
   * gets by default, but every staff member should see a trial-ending
   * warning, not just the owner. Just needs a valid token (JwtAuthGuard),
   * same posture as GET /auth/me. Returns only the two fields the banner
   * needs, nothing else about the tenant.
   */
  async getTrialStatus() {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({
      where: { id: tenantId },
      select: { planTier: true, trialEndsAt: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  /** Self-service: the caller's own tenant, resolved from TenantContext. */
  async getCurrentTenant() {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true, branches: { where: { deletedAt: null } } },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.settings) return tenant;

    return {
      ...tenant,
      settings: {
        ...tenant.settings,
        logoUrl: await resolveDisplayUrl(this.storage, tenant.settings.logoUrl),
        loginBackgroundUrl: await resolveDisplayUrl(this.storage, tenant.settings.loginBackgroundUrl),
      },
    };
  }

  async updateSettings(dto: UpdateTenantSettingsDto) {
    const tenantId = TenantContext.requireTenantId();
    const settings = await this.prisma.platform.tenantSettings.update({
      where: { tenantId },
      data: dto,
    });
    return {
      ...settings,
      logoUrl: await resolveDisplayUrl(this.storage, settings.logoUrl),
      loginBackgroundUrl: await resolveDisplayUrl(this.storage, settings.loginBackgroundUrl),
    };
  }

  /**
   * Public (pre-auth) lookup by slug — the login screen doesn't know which
   * tenant it's for until the user types the workshop slug into the form,
   * so there's no TenantContext yet; `platform` is the correct escape
   * hatch here, not a request-scoped bypass. Returns the same shape
   * (nulls) for an unknown slug rather than 404ing, so this can't be used
   * to enumerate which workshop slugs exist.
   */
  async getBrandingBySlug(slug: string) {
    const tenant = await this.prisma.platform.tenant.findUnique({
      where: { slug },
      include: { settings: true },
    });
    if (!tenant?.settings) return { loginBackgroundUrl: null };
    return { loginBackgroundUrl: await resolveDisplayUrl(this.storage, tenant.settings.loginBackgroundUrl) };
  }
}
