import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: string) {
    return this.prisma.department.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: dto,
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.department.delete({ where: { id } });
  }
}
