import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuditLogsService } from './audit-logs.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';



@ApiTags('audit-logs')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@AdminRoles()

@Controller('audit-logs')

export class AuditLogsController {

  constructor(private service: AuditLogsService) {}



  @Get()

  findAll(

    @Query('module') module?: string,

    @Query('userId') userId?: string,

    @Query('limit') limit?: string,

  ) {

    return this.service.findAll(

      module,

      userId,

      limit ? parseInt(limit, 10) : 100,

    );

  }

}

