import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeLocationDto, UpdateOfficeLocationDto } from './dto/office-location.dto';

@Injectable()
export class OfficeLocationsService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: string) {
    return this.prisma.officeLocation.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { staff: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const location = await this.prisma.officeLocation.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
    if (!location) throw new NotFoundException('Office location not found');
    return location;
  }

  create(dto: CreateOfficeLocationDto) {
    return this.prisma.officeLocation.create({
      data: {
        name: dto.name,
        branchId: dto.branchId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        allowedRadiusMeters: dto.allowedRadiusMeters ?? 100,
        isActive: dto.isActive ?? true,
      },
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateOfficeLocationDto) {
    await this.findOne(id);
    return this.prisma.officeLocation.update({
      where: { id },
      data: dto,
      include: { branch: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.officeLocation.delete({ where: { id } });
  }
}
