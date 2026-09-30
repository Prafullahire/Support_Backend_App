import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntityDto, UpdateEntityDto } from './dto/entity.dto';

@Injectable()
export class EntitiesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.entity.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const entity = await this.prisma.entity.findUnique({ where: { id } });
    if (!entity) throw new NotFoundException('Entity not found');
    return entity;
  }

  create(dto: CreateEntityDto) {
    return this.prisma.entity.create({ data: dto });
  }

  async update(id: string, dto: UpdateEntityDto) {
    await this.findOne(id);
    return this.prisma.entity.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.entity.delete({ where: { id } });
  }
}
