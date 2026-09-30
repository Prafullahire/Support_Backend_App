import { Injectable, NotFoundException } from '@nestjs/common';
import { PgStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePgRecordDto, UpdatePgRecordDto } from './dto/pg-record.dto';

@Injectable()
export class PgRecordsService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: string, status?: PgStatus) {
    return this.prisma.pgRecord.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { agreementEnd: 'asc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.pgRecord.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!record) throw new NotFoundException('PG record not found');
    return record;
  }

  create(dto: CreatePgRecordDto) {
    return this.prisma.pgRecord.create({
      data: {
        ...dto,
        agreementStart: new Date(dto.agreementStart),
        agreementEnd: new Date(dto.agreementEnd),
      },
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdatePgRecordDto) {
    await this.findOne(id);
    return this.prisma.pgRecord.update({
      where: { id },
      data: {
        ...dto,
        agreementStart: dto.agreementStart ? new Date(dto.agreementStart) : undefined,
        agreementEnd: dto.agreementEnd ? new Date(dto.agreementEnd) : undefined,
      },
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.pgRecord.delete({ where: { id } });
  }
}
