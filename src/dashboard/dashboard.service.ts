import { Injectable } from '@nestjs/common';
import {
  AmcStatus,
  AssetStatus,
  RequestStatus,
  UserRole,
} from '../common/enums';
import { isPrivilegedAdmin } from '../common/constants/roles.constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string, role: UserRole, branchId?: string) {
    const branchFilter = branchId ? { branchId } : {};
    const isAdmin = isPrivilegedAdmin(role);
    const userFilter = isAdmin ? {} : { createdById: userId };

    const [
      totalRequests,
      pendingRequests,
      completedRequests,
      totalAssets,
      availableAssets,
      expenseAgg,
      expiringAmc,
      lowStockJoiningKit,
      lowStockBrochures,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.request.count({ where: { ...branchFilter, ...userFilter } }),
      this.prisma.request.count({
        where: {
          ...branchFilter,
          ...userFilter,
          status: {
            in: [
              RequestStatus.SUBMITTED,
              RequestStatus.UNDER_REVIEW,
              RequestStatus.IN_PROGRESS,
            ],
          },
        },
      }),
      this.prisma.request.count({
        where: {
          ...branchFilter,
          ...userFilter,
          status: RequestStatus.COMPLETED,
        },
      }),
      this.prisma.asset.count({ where: branchFilter }),
      this.prisma.asset.count({
        where: { ...branchFilter, status: AssetStatus.AVAILABLE },
      }),
      this.prisma.expense.aggregate({
        where: { ...branchFilter, ...userFilter },
        _sum: { amount: true },
      }),
      this.prisma.amcRecord.count({
        where: {
          ...branchFilter,
          status: AmcStatus.ACTIVE,
          endDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      this.getLowStockJoiningKitCount(branchFilter),
      this.getLowStockBrochureCount(branchFilter),
      this.prisma.notification.count({
        where: isAdmin ? { isRead: false } : { userId, isRead: false },
      }),
    ]);

    return {
      role,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalAssets,
      availableAssets,
      totalExpenses: Number(expenseAgg._sum.amount || 0),
      expiringAmc,
      lowStockItems: lowStockJoiningKit + lowStockBrochures,
      unreadNotifications,
    };
  }

  private async getLowStockJoiningKitCount(branchFilter: { branchId?: string }) {
    const stocks = await this.prisma.joiningKitStock.findMany({ where: branchFilter });
    return stocks.filter((s) => s.quantity <= s.minStock).length;
  }

  private async getLowStockBrochureCount(branchFilter: { branchId?: string }) {
    const stocks = await this.prisma.brochureStock.findMany({ where: branchFilter });
    return stocks.filter((s) => s.quantity <= s.minStock).length;
  }
}
