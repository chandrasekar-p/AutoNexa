import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const ROLE_SELECT = {
  id: true,
  name: true,
  isSystem: true,
  permissions: { select: { permission: { select: { id: true, resource: true, action: true } } } },
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists this tenant's own roles plus visible system roles (excludes Super Admin). */
  async findAll() {
    const roles = await this.prisma.forTenant().role.findMany({
      where: { name: { not: 'Super Admin' } },
      select: ROLE_SELECT,
      orderBy: { name: 'asc' },
    });
    return roles;
  }

  async findOne(id: string) {
    const role = await this.prisma.forTenant().role.findFirst({ where: { id }, select: ROLE_SELECT });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateRoleDto) {
    await this.assertPermissionsExist(dto.permissionIds);
    return this.prisma.forTenant().role.create({
      data: {
        name: dto.name,
        isSystem: false,
        permissions: { create: dto.permissionIds.map((permissionId) => ({ permissionId })) },
      },
      select: ROLE_SELECT,
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (role.isSystem) throw new ForbiddenException('System roles cannot be modified');

    const db = this.prisma.forTenant();
    if (dto.permissionIds) {
      await this.assertPermissionsExist(dto.permissionIds);
      await db.rolePermission.deleteMany({ where: { roleId: id } });
    }

    return db.role.update({
      where: { id },
      data: {
        name: dto.name,
        ...(dto.permissionIds
          ? { permissions: { create: dto.permissionIds.map((permissionId) => ({ permissionId })) } }
          : {}),
      },
      select: ROLE_SELECT,
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem) throw new ForbiddenException('System roles cannot be deleted');

    const assignedCount = await this.prisma.forTenant().userRole.count({ where: { roleId: id } });
    if (assignedCount > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${assignedCount} user(s) are still assigned to it. Reassign them first.`,
      );
    }
    const db = this.prisma.forTenant();
    // RolePermission has no onDelete: Cascade on its roleId relation — every
    // role has at least one of these rows (roles are created with
    // permissions), so deleting the Role first always violated the FK
    // constraint and 500'd. Clear its own permission rows first, same as
    // update() already does when replacing them.
    await db.rolePermission.deleteMany({ where: { roleId: id } });
    return db.role.delete({ where: { id } });
  }

  private async assertPermissionsExist(permissionIds: string[]) {
    if (permissionIds.length === 0) throw new BadRequestException('At least one permission is required');
    // Permissions are global (not tenant-scoped), so this checks the raw platform table.
    const found = await this.prisma.platform.permission.findMany({ where: { id: { in: permissionIds } } });
    if (found.length !== permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }
  }
}
