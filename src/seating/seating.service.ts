import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeatingRecordDto, UpdateSeatingRecordDto } from './dto/seating.dto';

@Injectable()
export class SeatingService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: string, date?: string) {
    const recordDate = date ? new Date(date) : undefined;
    return this.prisma.seatingRecord.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(recordDate
          ? {
              recordDate: {
                gte: new Date(recordDate.setHours(0, 0, 0, 0)),
                lt: new Date(recordDate.setHours(23, 59, 59, 999)),
              },
            }
          : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { recordDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.seatingRecord.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!record) throw new NotFoundException('Seating record not found');
    return record;
  }

  create(dto: CreateSeatingRecordDto) {
    return this.prisma.seatingRecord.create({
      data: {
        ...dto,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
      },
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateSeatingRecordDto) {
    await this.findOne(id);
    return this.prisma.seatingRecord.update({
      where: { id },
      data: {
        ...dto,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
      },
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.seatingRecord.delete({ where: { id } });
  }
}
