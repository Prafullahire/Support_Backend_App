import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJoiningKitItemDto,
  IssueJoiningKitDto,
  ReturnJoiningKitDto,
  UpdateJoiningKitItemDto,
  UpsertJoiningKitStockDto,
} from './dto/joining-kit.dto';

@Injectable()
export class JoiningKitService {
  constructor(private prisma: PrismaService) {}

  findAllItems() {
    return this.prisma.joiningKitItem.findMany({ orderBy: { name: 'asc' } });
  }

  async findOneItem(id: string) {
    const item = await this.prisma.joiningKitItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Joining kit item not found');
    return item;
  }

  createItem(dto: CreateJoiningKitItemDto) {
    return this.prisma.joiningKitItem.create({ data: dto });
  }

  async updateItem(id: string, dto: UpdateJoiningKitItemDto) {
    await this.findOneItem(id);
    return this.prisma.joiningKitItem.update({ where: { id }, data: dto });
  }

  findAllStock(branchId?: string) {
    return this.prisma.joiningKitStock.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        item: true,
        branch: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertStock(dto: UpsertJoiningKitStockDto) {
    const include = {
      item: true,
      branch: { select: { id: true, name: true } },
    };

    const existing = await this.prisma.joiningKitStock.findFirst({
      where: {
        itemId: dto.itemId,
        branchId: dto.branchId ?? null,
      },
    });

    if (existing) {
      return this.prisma.joiningKitStock.update({
        where: { id: existing.id },
        data: {
          quantity: dto.quantity,
          ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
        },
        include,
      });
    }

    return this.prisma.joiningKitStock.create({
      data: {
        itemId: dto.itemId,
        branchId: dto.branchId,
        quantity: dto.quantity,
        minStock: dto.minStock ?? 5,
      },
      include,
    });
  }

  findAllIssues() {
    return this.prisma.joiningKitIssue.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { item: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async issueKit(dto: IssueJoiningKitDto) {
    const issueNumber = `JK-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      for (const line of dto.items) {
        const stock = await tx.joiningKitStock.findFirst({
          where: { itemId: line.itemId },
        });
        if (!stock || stock.quantity < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for item ${line.itemId}`,
          );
        }
        await tx.joiningKitStock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity - line.quantity },
        });
      }

      return tx.joiningKitIssue.create({
        data: {
          issueNumber,
          userId: dto.userId,
          employeeId: dto.employeeId,
          employeeName: dto.employeeName,
          location: dto.location,
          branchId: dto.branchId,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          items: { include: { item: true } },
        },
      });
    });
  }

  async returnKit(id: string, dto: ReturnJoiningKitDto) {
    const issue = await this.prisma.joiningKitIssue.findUnique({
      where: { id },
    });
    if (!issue) throw new NotFoundException('Joining kit issue not found');
    if (issue.isReturned) throw new BadRequestException('Kit already returned');

    return this.prisma.joiningKitIssue.update({
      where: { id },
      data: {
        isReturned: true,
        returnedAt: new Date(),
        ...(dto.notes ? { notes: dto.notes } : {}),
      },
    });
  }
}
