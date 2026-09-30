import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, UserRole } from '../common/enums';
import { isPrivilegedAdmin } from '../common/constants/roles.constants';
import { PrismaService } from '../prisma/prisma.service';
import { StatusNotificationService } from '../notifications/status-notification.service';
import {
  CreateCourierDto,
  UpdateCourierDto,
  UpdateCourierStatusDto,
} from './dto/courier.dto';

@Injectable()
export class CourierService {
  constructor(
    private prisma: PrismaService,
    private statusNotification: StatusNotificationService,
    private config: ConfigService,
  ) {}

  findAll(userId: string, role: UserRole, branchId?: string) {
    const where = isPrivilegedAdmin(role)
      ? { ...(branchId ? { branchId } : {}) }
      : { createdById: userId };

    return this.prisma.courierRequest.findMany({
      where,
      include: this.include(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const record = await this.prisma.courierRequest.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!record) throw new NotFoundException('Courier request not found');
    if (!isPrivilegedAdmin(role) && record.createdById !== userId) {
      throw new NotFoundException('Courier request not found');
    }
    return record;
  }

  create(dto: CreateCourierDto, userId: string) {
    const requestNumber = `CR-${Date.now()}`;
    return this.prisma.courierRequest.create({
      data: {
        ...dto,
        requestNumber,
        createdById: userId,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
      },
      include: this.include(),
    });
  }

  async update(id: string, dto: UpdateCourierDto, userId: string, role: UserRole) {
    await this.findOne(id, userId, role);
    return this.prisma.courierRequest.update({
      where: { id },
      data: {
        ...dto,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
      },
      include: this.include(),
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateCourierStatusDto,
    userId: string,
    role: UserRole,
  ) {
    const existing = await this.findOne(id, userId, role);
    const updated = await this.prisma.courierRequest.update({
      where: { id },
      data: {
        status: dto.status,
        trackingNumber: dto.trackingNumber,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
      },
      include: this.include(),
    });

    if (isPrivilegedAdmin(role) && dto.status !== existing.status) {
      await this.notifyCourierStatusChange(existing, dto.status, userId, id);
    }

    return updated;
  }

  async remove(id: string, userId: string, role: UserRole) {
    await this.findOne(id, userId, role);
    return this.prisma.courierRequest.delete({ where: { id } });
  }

  private async notifyCourierStatusChange(
    existing: { createdById: string; requestNumber: string; status: string },
    newStatus: string,
    userId: string,
    id: string,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    await this.statusNotification.notifyStatusChange({
      module: 'Courier',
      recordId: id,
      recordTitle: existing.requestNumber,
      oldStatus: existing.status,
      newStatus,
      updatedByUserId: userId,
      recipientUserIds: [existing.createdById],
      notificationType: NotificationType.COURIER_DELIVERY,
      link: `${frontendUrl}/courier`,
    });
  }

  private include() {
    return {
      vendor: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
    };
  }
}
