import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  branchId: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const db = this.prisma.forTenant();

    const existing = await db.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists in this workshop');

    await this.assertRolesBelongToTenant(dto.roleIds);

    const passwordHash = await argon2.hash(dto.password);
    const user = await db.user.create({
      // Cast needed because forTenant() injects tenantId into `data` at
      // runtime (see PrismaService) — the generated create type can't see that.
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        branchId: dto.branchId,
        passwordHash,
        roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
      } as unknown as Prisma.UserUncheckedCreateInput,
      select: SAFE_SELECT,
    });
    return user;
  }

  findAll() {
    return this.prisma.forTenant().user.findMany({
      where: { deletedAt: null },
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.forTenant().user.findFirst({
      where: { id, deletedAt: null },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    const db = this.prisma.forTenant();

    if (dto.roleIds) {
      await this.assertRolesBelongToTenant(dto.roleIds);
      await db.userRole.deleteMany({ where: { userId: id } });
    }

    return db.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        branchId: dto.branchId,
        isActive: dto.isActive,
        ...(dto.roleIds ? { roles: { create: dto.roleIds.map((roleId) => ({ roleId })) } } : {}),
      },
      select: SAFE_SELECT,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.forTenant().user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: SAFE_SELECT,
    });
  }

  /** GET /users/me — no permission gate; every authenticated user can see their own record, unlike GET /users/:id (user:read). */
  findOwnProfile(userId: string) {
    return this.findOne(userId);
  }

  updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    return this.prisma.forTenant().user.update({
      where: { id: userId },
      data: { name: dto.name, phone: dto.phone },
      select: SAFE_SELECT,
    });
  }

  async changeOwnPassword(userId: string, dto: ChangePasswordDto) {
    const db = this.prisma.forTenant();
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await argon2.hash(dto.newPassword);
    await db.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  }

  private async assertRolesBelongToTenant(roleIds: string[]) {
    if (roleIds.length === 0) throw new BadRequestException('At least one role is required');
    const roles = await this.prisma.forTenant().role.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more role IDs are invalid for this workshop');
    }
  }
}
