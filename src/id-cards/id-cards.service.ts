import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignIdCardDto, CreateIdCardDto, UpdateIdCardDto } from './dto/id-card.dto';

@Injectable()
export class IdCardsService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: string, availableOnly = false) {
    return this.prisma.idCard.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(availableOnly ? { isAvailable: true } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { cardNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const card = await this.prisma.idCard.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!card) throw new NotFoundException('ID card not found');
    return card;
  }

  create(dto: CreateIdCardDto) {
    return this.prisma.idCard.create({
      data: dto,
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateIdCardDto) {
    await this.findOne(id);
    return this.prisma.idCard.update({
      where: { id },
      data: dto,
      include: {
        branch: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.idCard.delete({ where: { id } });
  }

  async assign(id: string, dto: AssignIdCardDto) {
    const card = await this.findOne(id);
    if (!card.isAvailable) {
      throw new BadRequestException('ID card is not available');
    }

    return this.prisma.idCard.update({
      where: { id },
      data: {
        assignedToId: dto.assignedToId,
        assignedAt: new Date(),
        isAvailable: false,
      },
      include: {
        branch: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async unassign(id: string) {
    const card = await this.findOne(id);
    if (card.isAvailable) {
      throw new BadRequestException('ID card is not assigned');
    }

    return this.prisma.idCard.update({
      where: { id },
      data: {
        assignedToId: null,
        assignedAt: null,
        isAvailable: true,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }
}
