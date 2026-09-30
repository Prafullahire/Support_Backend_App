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

import { DepartmentsService } from './departments.service';

import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('departments')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('departments')

export class DepartmentsController {

  constructor(private service: DepartmentsService) {}



  @Get()

  findAll(@CurrentUser() user: ScopedUser, @Query('branchId') branchId?: string) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAll(scope.branchId);

  }



  @Get(':id')

  findOne(@Param('id') id: string) {

    return this.service.findOne(id);

  }



  @Post()

  @AdminRoles()

  create(@Body() dto: CreateDepartmentDto) {

    return this.service.create(dto);

  }



  @Put(':id')

  @AdminRoles()

  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {

    return this.service.update(id, dto);

  }



  @Delete(':id')

  @AdminRoles()

  remove(@Param('id') id: string) {

    return this.service.remove(id);

  }

}

