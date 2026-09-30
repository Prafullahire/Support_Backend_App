import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBrochureStockDto,
  IssueBrochureDto,
  UpdateBrochureStockDto,
} from './dto/brochure.dto';

@Injectable()
export class BrochuresService {
  constructor(private prisma: PrismaService) {}

  findAllStock(branchId?: string) {
    return this.prisma.brochureStock.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneStock(id: string) {
    const stock = await this.prisma.brochureStock.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } },
    });
    if (!stock) throw new NotFoundException('Brochure stock not found');
    return stock;
  }

  createStock(dto: CreateBrochureStockDto) {
    return this.prisma.brochureStock.create({
      data: dto,
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async updateStock(id: string, dto: UpdateBrochureStockDto) {
    await this.findOneStock(id);
    return this.prisma.brochureStock.update({
      where: { id },
      data: dto,
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async removeStock(id: string) {
    await this.findOneStock(id);
    return this.prisma.brochureStock.delete({ where: { id } });
  }

  findAllIssues() {
    return this.prisma.brochureIssue.findMany({
      include: {
        stock: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async issueBrochure(dto: IssueBrochureDto) {
    const stock = await this.findOneStock(dto.stockId);
    if (stock.quantity < dto.quantity) {
      throw new BadRequestException('Insufficient brochure stock');
    }

    const issueNumber = `BR-${Date.now()}`;

    const [issue] = await this.prisma.$transaction([
      this.prisma.brochureIssue.create({
        data: {
          issueNumber,
          stockId: dto.stockId,
          userId: dto.userId,
          quantity: dto.quantity,
          notes: dto.notes,
        },
        include: {
          stock: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.brochureStock.update({
        where: { id: dto.stockId },
        data: { quantity: stock.quantity - dto.quantity },
      }),
    ]);

    return issue;
  }
}
