import { Injectable } from '@nestjs/common';
import { AmcStatus, AssetStatus, PgStatus, RequestStatus } from '../common/enums';
import * as XLSX from 'xlsx';
import { buildExpenseDateFilter, isValidQueryValue } from '../common/utils/query.util';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(query: ReportQueryDto) {
    const branchFilter = isValidQueryValue(query.branchId) ? { branchId: query.branchId } : {};
    const entityFilter = isValidQueryValue(query.entityId) ? { entityId: query.entityId } : {};
    const expenseFilter = { ...branchFilter, ...entityFilter };
    const dateFilter = buildExpenseDateFilter(query.startDate, query.endDate);

    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [
      totalRequests,
      pendingRequests,
      totalAssets,
      assignedAssets,
      totalExpenses,
      expiringAmc,
      activePg,
      lowStockJoiningKit,
      lowStockBrochures,
      expenseSummary,
    ] = await Promise.all([
      this.prisma.request.count({ where: branchFilter }),
      this.prisma.request.count({
        where: {
          ...branchFilter,
          status: { in: [RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW, RequestStatus.IN_PROGRESS] },
        },
      }),
      this.prisma.asset.count({ where: branchFilter }),
      this.prisma.asset.count({ where: { ...branchFilter, status: AssetStatus.ASSIGNED } }),
      this.prisma.expense.aggregate({
        where: { ...expenseFilter, ...dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.amcRecord.count({
        where: {
          ...branchFilter,
          status: AmcStatus.ACTIVE,
          endDate: { lte: thirtyDays, gte: now },
        },
      }),
      this.prisma.pgRecord.count({
        where: { ...branchFilter, status: PgStatus.ACTIVE },
      }),
      this.prisma.joiningKitStock.findMany({ where: branchFilter }).then((items) =>
        items.filter((s) => s.quantity <= s.minStock).length,
      ),
      this.prisma.brochureStock.findMany({ where: branchFilter }).then((items) =>
        items.filter((s) => s.quantity <= s.minStock).length,
      ),
      this.getExpenseSummary(query),
    ]);

    return {
      requests: { total: totalRequests, pending: pendingRequests },
      assets: { total: totalAssets, assigned: assignedAssets },
      expenses: {
        totalAmount: totalExpenses._sum.amount ?? 0,
        count: totalExpenses._count,
      },
      expenseSummary,
      amc: { expiringSoon: expiringAmc },
      pg: { active: activePg },
      stock: { lowJoiningKit: lowStockJoiningKit, lowBrochures: lowStockBrochures },
    };
  }

  async getExpenseSummary(query: ReportQueryDto) {
    const dateFilter = buildExpenseDateFilter(query.startDate, query.endDate);

    const where = {
      ...(isValidQueryValue(query.entityId) ? { entityId: query.entityId } : {}),
      ...(isValidQueryValue(query.branchId) ? { branchId: query.branchId } : {}),
      ...dateFilter,
    };

    const [entities, branches, expenses] = await Promise.all([
      this.prisma.entity.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.expense.findMany({
        where,
        select: { amount: true, entityId: true, branchId: true },
      }),
    ]);

    const entityWise = entities.map((entity) => {
      const entityExpenses = expenses.filter((e) => e.entityId === entity.id);
      const branchBreakdown = branches
        .map((branch) => {
          const branchExpenses = entityExpenses.filter((e) => e.branchId === branch.id);
          const total = branchExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          return { branchId: branch.id, branchName: branch.name, total, count: branchExpenses.length };
        })
        .filter((b) => b.count > 0);

      return {
        entityId: entity.id,
        entityName: entity.name,
        total: entityExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        count: entityExpenses.length,
        branches: branchBreakdown,
      };
    }).filter((e) => e.count > 0);

    const branchWise = branches
      .map((branch) => {
        const branchExpenses = expenses.filter((e) => e.branchId === branch.id);
        return {
          branchId: branch.id,
          branchName: branch.name,
          total: branchExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
          count: branchExpenses.length,
        };
      })
      .filter((b) => b.count > 0);

    return {
      grandTotal: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
      totalCount: expenses.length,
      entityWise,
      branchWise,
    };
  }

  async exportToExcel(module: string, query: ReportQueryDto): Promise<Buffer> {
    const branchFilter = isValidQueryValue(query.branchId) ? { branchId: query.branchId } : {};
    let data: Record<string, unknown>[] = [];

    switch (module) {
      case 'requests':
        data = await this.prisma.request.findMany({
          where: branchFilter,
          include: {
            branch: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
          },
        });
        break;
      case 'assets':
        data = await this.prisma.asset.findMany({
          where: branchFilter,
          include: { category: { select: { name: true } }, branch: { select: { name: true } } },
        });
        break;
      case 'expenses':
        data = await this.prisma.expense.findMany({
          where: {
            ...(isValidQueryValue(query.branchId) ? { branchId: query.branchId } : {}),
            ...(isValidQueryValue(query.entityId) ? { entityId: query.entityId } : {}),
            ...buildExpenseDateFilter(query.startDate, query.endDate),
          },
          include: {
            category: { select: { name: true } },
            entity: { select: { name: true } },
            branch: { select: { name: true } },
          },
        });
        break;
      case 'vendors':
        data = await this.prisma.vendor.findMany();
        break;
      case 'amc':
        data = await this.prisma.amcRecord.findMany({
          where: branchFilter,
          include: { vendor: { select: { name: true } }, branch: { select: { name: true } } },
        });
        break;
      default:
        data = [];
    }

    const worksheet = XLSX.utils.json_to_sheet(
      data.map((row) => this.flattenRow(row)),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, module);
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  private flattenRow(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        Object.assign(result, this.flattenRow(value as Record<string, unknown>, fullKey));
      } else if (value instanceof Date) {
        result[fullKey] = value.toISOString();
      } else if (typeof value !== 'object') {
        result[fullKey] = value;
      }
    }
    return result;
  }
}
