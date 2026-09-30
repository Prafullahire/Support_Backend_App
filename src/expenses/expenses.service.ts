import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isPrivilegedAdmin } from '../common/constants/roles.constants';
import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';
import { buildExpenseDateFilter, isValidQueryValue } from '../common/utils/query.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  ExpenseFilterDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  findAll(user: ScopedUser, filters: ExpenseFilterDto = {}) {
    const scope = resolveBranchFilter(user, filters.branchId);
    const where: Prisma.ExpenseWhereInput = {
      ...(isPrivilegedAdmin(user.role)
        ? scope.branchId
          ? { branchId: scope.branchId }
          : {}
        : { createdById: user.id }),
      ...(isValidQueryValue(filters.entityId) ? { entityId: filters.entityId } : {}),
      ...(isValidQueryValue(filters.categoryId) ? { categoryId: filters.categoryId } : {}),
      ...buildExpenseDateFilter(filters.startDate, filters.endDate),
    };

    const sortBy = filters.sortBy || 'expenseDate';
    const sortOrder = filters.sortOrder || 'desc';

    return this.prisma.expense.findMany({
      where,
      include: this.include(),
      orderBy: { [sortBy]: sortOrder },
    });
  }

  async getSummary(user: ScopedUser, filters: ExpenseFilterDto = {}) {
    const scope = resolveBranchFilter(user, filters.branchId);
    const baseWhere: Prisma.ExpenseWhereInput = {
      ...(isPrivilegedAdmin(user.role)
        ? scope.branchId
          ? { branchId: scope.branchId }
          : {}
        : { createdById: user.id }),
      ...(isValidQueryValue(filters.entityId) ? { entityId: filters.entityId } : {}),
      ...buildExpenseDateFilter(filters.startDate, filters.endDate),
    };

    const branchWhere = scope.branchId ? { id: scope.branchId } : {};

    const [entities, branches, expenses] = await Promise.all([
      this.prisma.entity.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.branch.findMany({
        where: { isActive: true, ...branchWhere },
        orderBy: { name: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: baseWhere,
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

      const total = entityExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      return {
        entityId: entity.id,
        entityName: entity.name,
        total,
        count: entityExpenses.length,
        branches: branchBreakdown,
      };
    });

    const branchWise = branches.map((branch) => {
      const branchExpenses = expenses.filter((e) => e.branchId === branch.id);
      const total = branchExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      return {
        branchId: branch.id,
        branchName: branch.name,
        total,
        count: branchExpenses.length,
      };
    }).filter((b) => b.count > 0);

    const grandTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      grandTotal,
      totalCount: expenses.length,
      entityWise: entityWise.filter((e) => e.count > 0),
      branchWise,
      allEntities: entities,
      allBranches: branches,
    };
  }

  async findOne(id: string, userId: string, role: ScopedUser['role']) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: this.include(),
    });
    if (!expense) throw new NotFoundException('Expense not found');
    if (!isPrivilegedAdmin(role) && expense.createdById !== userId) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  create(dto: CreateExpenseDto, userId: string) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        createdById: userId,
      },
      include: this.include(),
    });
  }

  async update(id: string, dto: UpdateExpenseDto, userId: string, role: ScopedUser['role']) {
    await this.findOne(id, userId, role);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
      },
      include: this.include(),
    });
  }

  async remove(id: string, userId: string, role: ScopedUser['role']) {
    await this.findOne(id, userId, role);
    return this.prisma.expense.delete({ where: { id } });
  }

  findAllCategories() {
    return this.prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
  }

  createCategory(dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateExpenseCategoryDto) {
    const category = await this.prisma.expenseCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return this.prisma.expenseCategory.update({ where: { id }, data: dto });
  }

  private include() {
    return {
      category: { select: { id: true, name: true } },
      vendor: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true, code: true } },
      branch: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    };
  }
}
