import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  // Every method here goes through prisma.forTenant() — the tenantId
  // filter/injection happens automatically (see PrismaService), so no
  // method in this service ever needs to accept or handle tenantId itself.
  // The cast below is required because forTenant()'s extension injects
  // tenantId into `data` at runtime, which Prisma's generated types for
  // `create` can't reflect statically.

  create(dto: CreateBranchDto) {
    return this.prisma.forTenant().branch.create({
      data: dto as unknown as Prisma.BranchUncheckedCreateInput,
    });
  }

  findAll() {
    return this.prisma.forTenant().branch.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.forTenant().branch.findFirst({ where: { id, deletedAt: null } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    return this.prisma.forTenant().branch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.forTenant().branch.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
