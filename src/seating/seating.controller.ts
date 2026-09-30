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

import { SeatingService } from './seating.service';

import { CreateSeatingRecordDto, UpdateSeatingRecordDto } from './dto/seating.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('seating')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('seating')

export class SeatingController {

  constructor(private service: SeatingService) {}



  @Get()

  findAll(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

    @Query('date') date?: string,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAll(scope.branchId, date);

  }



  @Get(':id')

  findOne(@Param('id') id: string) {

    return this.service.findOne(id);

  }



  @Post()

  @AdminRoles()

  create(@Body() dto: CreateSeatingRecordDto) {

    return this.service.create(dto);

  }



  @Put(':id')

  @AdminRoles()

  update(@Param('id') id: string, @Body() dto: UpdateSeatingRecordDto) {

    return this.service.update(id, dto);

  }



  @Delete(':id')

  @AdminRoles()

  remove(@Param('id') id: string) {

    return this.service.remove(id);

  }

}

