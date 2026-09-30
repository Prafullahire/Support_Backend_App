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

import { AmcStatus } from '../common/enums';

import { AmcService } from './amc.service';

import { CreateAmcDto, UpdateAmcDto } from './dto/amc.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('amc')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('amc')

export class AmcController {

  constructor(private service: AmcService) {}



  @Get()

  findAll(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

    @Query('status') status?: AmcStatus,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAll(scope.branchId, status);

  }



  @Get('expiring')

  findExpiring(

    @CurrentUser() user: ScopedUser,

    @Query('days') days?: string,

    @Query('branchId') branchId?: string,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findExpiring(days ? parseInt(days, 10) : 30, scope.branchId);

  }



  @Get(':id')

  findOne(@Param('id') id: string) {

    return this.service.findOne(id);

  }



  @Post()

  @AdminRoles()

  create(@Body() dto: CreateAmcDto) {

    return this.service.create(dto);

  }



  @Put(':id')

  @AdminRoles()

  update(@Param('id') id: string, @Body() dto: UpdateAmcDto) {

    return this.service.update(id, dto);

  }



  @Delete(':id')

  @AdminRoles()

  remove(@Param('id') id: string) {

    return this.service.remove(id);

  }

}

