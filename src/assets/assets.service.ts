import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignAssetDto,
  CreateAssetCategoryDto,
  CreateAssetDto,
  ReturnAssetDto,
  UpdateAssetCategoryDto,
  UpdateAssetDto,
} from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: string, status?: AssetStatus) {
    return this.prisma.asset.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {}),
      },
      include: this.assetInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        ...this.assetInclude(),
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  create(dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        assignedDate: dto.assignedDate ? new Date(dto.assignedDate) : undefined,
        warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : undefined,
      },
      include: this.assetInclude(),
    });
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        assignedDate: dto.assignedDate ? new Date(dto.assignedDate) : undefined,
        warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : undefined,
      },
      include: this.assetInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asset.delete({ where: { id } });
  }

  async assign(id: string, dto: AssignAssetDto) {
    const asset = await this.findOne(id);
    if (asset.status === AssetStatus.ASSIGNED) {
      throw new BadRequestException('Asset is already assigned');
    }

    const [assignment] = await this.prisma.$transaction([
      this.prisma.assetAssignment.create({
        data: {
          assetId: id,
          userId: dto.userId,
          condition: dto.condition,
          notes: dto.notes,
        },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.asset.update({
        where: { id },
        data: { status: AssetStatus.ASSIGNED },
      }),
    ]);

    return assignment;
  }

  async returnAsset(id: string, dto: ReturnAssetDto) {
    const asset = await this.findOne(id);
    if (asset.status !== AssetStatus.ASSIGNED) {
      throw new BadRequestException('Asset is not currently assigned');
    }

    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId: id, returnedAt: null },
      orderBy: { assignedAt: 'desc' },
    });

    if (!activeAssignment) {
      throw new BadRequestException('No active assignment found');
    }

    const [assignment] = await this.prisma.$transaction([
      this.prisma.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          returnedAt: new Date(),
          condition: dto.condition ?? activeAssignment.condition,
          notes: dto.notes ?? activeAssignment.notes,
        },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.asset.update({
        where: { id },
        data: { status: AssetStatus.AVAILABLE },
      }),
    ]);

    return assignment;
  }

  findAllCategories() {
    return this.prisma.assetCategory.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(dto: CreateAssetCategoryDto) {
    return this.prisma.assetCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateAssetCategoryDto) {
    const category = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.assetCategory.update({ where: { id }, data: dto });
  }

  private assetInclude() {
    return {
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    };
  }
}
