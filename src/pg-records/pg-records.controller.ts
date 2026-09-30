import {

  Controller,

  Get,

  Post,

  Put,

  Delete,

  Body,

  Param,

  Query,

  UseGuards,

} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PgStatus } from '../common/enums';

import { PgRecordsService } from './pg-records.service';

import { CreatePgRecordDto, UpdatePgRecordDto } from './dto/pg-record.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('pg-records')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('pg-records')

export class PgRecordsController {

  constructor(private service: PgRecordsService) {}



  @Get()

  findAll(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

    @Query('status') status?: PgStatus,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAll(scope.branchId, status);

  }



  @Get(':id')

  findOne(@Param('id') id: string) {

    return this.service.findOne(id);

  }



  @Post()

  @AdminRoles()

  create(@Body() dto: CreatePgRecordDto) {

    return this.service.create(dto);

  }



  @Put(':id')

  @AdminRoles()

  update(@Param('id') id: string, @Body() dto: UpdatePgRecordDto) {

    return this.service.update(id, dto);

  }



  @Delete(':id')

  @AdminRoles()

  remove(@Param('id') id: string) {

    return this.service.remove(id);

  }

}

