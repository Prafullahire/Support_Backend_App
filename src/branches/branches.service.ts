import { Injectable, NotFoundException } from '@nestjs/common';
import { isSuperAdmin } from '../common/constants/roles.constants';
import { assertBranchAccess, ScopedUser } from '../common/utils/branch-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  findAll(user: ScopedUser) {
    if (isSuperAdmin(user.role)) {
      return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
    }

    if (!user.branchId) {
      return [];
    }

    return this.prisma.branch.findMany({
      where: { id: user.branchId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user: ScopedUser) {
    assertBranchAccess(user, id);
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  create(dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: dto });
  }

  async update(id: string, dto: UpdateBranchDto, user: ScopedUser) {
    assertBranchAccess(user, id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return this.prisma.branch.delete({ where: { id } });
  }
}
