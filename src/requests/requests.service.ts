import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, UserRole } from '../common/enums';
import { isPrivilegedAdmin } from '../common/constants/roles.constants';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StatusNotificationService } from '../notifications/status-notification.service';
import { CreateRequestDto, UpdateRequestDto } from './dto/request.dto';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private statusNotification: StatusNotificationService,
    private config: ConfigService,
  ) {}

  findAll(userId: string, role: UserRole, branchId?: string) {
    const where = isPrivilegedAdmin(role)
      ? { ...(branchId ? { branchId } : {}) }
      : { createdById: userId };

    return this.prisma.request.findMany({
      where,
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!request) throw new NotFoundException('Request not found');
    if (!isPrivilegedAdmin(role) && request.createdById !== userId) {
      throw new NotFoundException('Request not found');
    }
    return request;
  }

  create(dto: CreateRequestDto, userId: string) {
    return this.prisma.request.create({
      data: { ...dto, createdById: userId },
      include: this.include(),
    });
  }

  async update(id: string, dto: UpdateRequestDto, userId: string, role: UserRole) {
    const existing = await this.findOne(id, userId, role);
    const updated = await this.prisma.request.update({
      where: { id },
      data: dto,
      include: this.include(),
    });

    if (isPrivilegedAdmin(role)) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const recipientIds = [existing.createdById];
      if (existing.assignedToId) recipientIds.push(existing.assignedToId);
      if (dto.assignedToId && !recipientIds.includes(dto.assignedToId)) {
        recipientIds.push(dto.assignedToId);
      }

      if (dto.status && dto.status !== existing.status) {
        await this.statusNotification.notifyStatusChange({
          module: 'Request',
          recordId: id,
          recordTitle: updated.title,
          oldStatus: existing.status,
          newStatus: dto.status,
          updatedByUserId: userId,
          recipientUserIds: recipientIds,
          notificationType:
            dto.status === 'COMPLETED'
              ? NotificationType.REQUEST_COMPLETED
              : NotificationType.REQUEST_UPDATED,
          link: `${frontendUrl}/requests`,
        });
      } else if (dto.assignedToId && dto.assignedToId !== existing.assignedToId) {
        await this.statusNotification.notifyStatusChange({
          module: 'Request',
          recordId: id,
          recordTitle: updated.title,
          newStatus: `Assigned to ${updated.assignedTo?.firstName || 'team member'}`,
          updatedByUserId: userId,
          recipientUserIds: [dto.assignedToId],
          notificationType: NotificationType.REQUEST_UPDATED,
          link: `${frontendUrl}/requests`,
        });
      }
    }

    return updated;
  }

  async remove(id: string, userId: string, role: UserRole) {
    await this.findOne(id, userId, role);
    return this.prisma.request.delete({ where: { id } });
  }

  private include() {
    return {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
    };
  }
}
