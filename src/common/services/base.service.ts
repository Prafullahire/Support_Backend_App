import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | undefined,
    action: string,
    module: string,
    recordId?: string,
    details?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        module,
        recordId,
        details,
      },
    });
  }
}

@Injectable()
export class BaseCrudService<T extends { id: string }> {
  constructor(
    protected prisma: PrismaService,
    protected modelName: string,
    protected auditService?: AuditService,
  ) {}

  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  async findAll(where: Record<string, unknown> = {}, include?: Record<string, unknown>) {
    return this.model.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, include?: Record<string, unknown>) {
    const record = await this.model.findUnique({ where: { id }, include });
    if (!record) {
      throw new NotFoundException(`${this.modelName} not found`);
    }
    return record;
  }

  async create(data: Record<string, unknown>, userId?: string) {
    const record = await this.model.create({ data });
    if (this.auditService) {
      await this.auditService.log(userId, 'CREATE', this.modelName, record.id);
    }
    return record;
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    await this.findOne(id);
    const record = await this.model.update({ where: { id }, data });
    if (this.auditService) {
      await this.auditService.log(userId, 'UPDATE', this.modelName, id);
    }
    return record;
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    const record = await this.model.delete({ where: { id } });
    if (this.auditService) {
      await this.auditService.log(userId, 'DELETE', this.modelName, id);
    }
    return record;
  }
}
