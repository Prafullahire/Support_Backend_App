import { Injectable, NotFoundException } from '@nestjs/common';
import { AmcStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAmcDto, UpdateAmcDto } from './dto/amc.dto';

@Injectable()
export class AmcService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: string, status?: AmcStatus) {
    return this.prisma.amcRecord.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {}),
      },
      include: this.include(),
      orderBy: { endDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.amcRecord.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!record) throw new NotFoundException('AMC record not found');
    return record;
  }

  create(dto: CreateAmcDto) {
    return this.prisma.amcRecord.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: this.include(),
    });
  }

  async update(id: string, dto: UpdateAmcDto) {
    await this.findOne(id);
    return this.prisma.amcRecord.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: this.include(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.amcRecord.delete({ where: { id } });
  }

  async findExpiring(days = 30, branchId?: string) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    const records = await this.prisma.amcRecord.findMany({
      where: {
        status: AmcStatus.ACTIVE,
        endDate: { lte: threshold, gte: now },
        ...(branchId ? { branchId } : {}),
      },
      include: this.include(),
      orderBy: { endDate: 'asc' },
    });

    const expired = await this.prisma.amcRecord.findMany({
      where: {
        status: AmcStatus.ACTIVE,
        endDate: { lt: now },
        ...(branchId ? { branchId } : {}),
      },
      include: this.include(),
      orderBy: { endDate: 'asc' },
    });

    return { expiringSoon: records, expired };
  }

  private include() {
    return {
      vendor: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    };
  }
}
