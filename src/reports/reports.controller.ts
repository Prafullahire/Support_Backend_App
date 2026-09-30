import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminRoles()
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('dashboard')
  getDashboardStats(@CurrentUser() user: ScopedUser, @Query() query: ReportQueryDto) {
    const scope = resolveBranchFilter(user, query.branchId);
    return this.service.getDashboardStats({ ...query, branchId: scope.branchId });
  }

  @Get('expenses/summary')
  getExpenseSummary(@CurrentUser() user: ScopedUser, @Query() query: ReportQueryDto) {
    const scope = resolveBranchFilter(user, query.branchId);
    return this.service.getExpenseSummary({ ...query, branchId: scope.branchId });
  }

  @Get('export')
  async exportExcel(
    @CurrentUser() user: ScopedUser,
    @Query('module') module: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const scope = resolveBranchFilter(user, query.branchId);
    const buffer = await this.service.exportToExcel(module || 'requests', {
      ...query,
      branchId: scope.branchId,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${module || 'report'}-${Date.now()}.xlsx"`,
    );
    res.send(buffer);
  }
}
