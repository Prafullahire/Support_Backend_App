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

  Patch,

} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { IdCardsService } from './id-cards.service';

import { AssignIdCardDto, CreateIdCardDto, UpdateIdCardDto } from './dto/id-card.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('id-cards')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('id-cards')

export class IdCardsController {

  constructor(private service: IdCardsService) {}



  @Get()

  findAll(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

    @Query('availableOnly') availableOnly?: string,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAll(scope.branchId, availableOnly === 'true');

  }



  @Get(':id')

  findOne(@Param('id') id: string) {

    return this.service.findOne(id);

  }



  @Post()

  @AdminRoles()

  create(@Body() dto: CreateIdCardDto) {

    return this.service.create(dto);

  }



  @Put(':id')

  @AdminRoles()

  update(@Param('id') id: string, @Body() dto: UpdateIdCardDto) {

    return this.service.update(id, dto);

  }



  @Delete(':id')

  @AdminRoles()

  remove(@Param('id') id: string) {

    return this.service.remove(id);

  }



  @Patch(':id/assign')

  @AdminRoles()

  assign(@Param('id') id: string, @Body() dto: AssignIdCardDto) {

    return this.service.assign(id, dto);

  }



  @Patch(':id/unassign')

  @AdminRoles()

  unassign(@Param('id') id: string) {

    return this.service.unassign(id);

  }

}

