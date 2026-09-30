import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { DashboardService } from './dashboard.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('dashboard')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('dashboard')

export class DashboardController {

  constructor(private service: DashboardService) {}



  @Get()

  getSummary(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.getSummary(user.id, user.role, scope.branchId);

  }

}

