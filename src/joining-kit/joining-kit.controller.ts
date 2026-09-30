import {

  Controller,

  Get,

  Post,

  Put,

  Body,

  Param,

  Query,

  UseGuards,

} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JoiningKitService } from './joining-kit.service';

import {

  CreateJoiningKitItemDto,
  IssueJoiningKitDto,
  ReturnJoiningKitDto,
  UpdateJoiningKitItemDto,

  UpsertJoiningKitStockDto,

} from './dto/joining-kit.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('joining-kit')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('joining-kit')

export class JoiningKitController {

  constructor(private service: JoiningKitService) {}



  @Get('items')

  findAllItems() {

    return this.service.findAllItems();

  }



  @Get('items/:id')

  findOneItem(@Param('id') id: string) {

    return this.service.findOneItem(id);

  }



  @Post('items')

  @AdminRoles()

  createItem(@Body() dto: CreateJoiningKitItemDto) {

    return this.service.createItem(dto);

  }



  @Put('items/:id')

  @AdminRoles()

  updateItem(@Param('id') id: string, @Body() dto: UpdateJoiningKitItemDto) {

    return this.service.updateItem(id, dto);

  }



  @Get('stock')

  findAllStock(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAllStock(scope.branchId);

  }



  @Post('stock')

  @AdminRoles()

  upsertStock(@Body() dto: UpsertJoiningKitStockDto) {

    return this.service.upsertStock(dto);

  }



  @Get('issues')

  findAllIssues() {

    return this.service.findAllIssues();

  }



  @Post('issue')

  @AdminRoles()

  issueKit(@Body() dto: IssueJoiningKitDto) {
    return this.service.issueKit(dto);
  }

  @Post('issues/:id/return')
  @AdminRoles()
  returnKit(@Param('id') id: string, @Body() dto: ReturnJoiningKitDto) {
    return this.service.returnKit(id, dto);
  }
}

