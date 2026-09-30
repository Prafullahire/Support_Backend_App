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

import { BrochuresService } from './brochures.service';

import {

  CreateBrochureStockDto,

  IssueBrochureDto,

  UpdateBrochureStockDto,

} from './dto/brochure.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('brochures')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('brochures')

export class BrochuresController {

  constructor(private service: BrochuresService) {}



  @Get('stock')

  findAllStock(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAllStock(scope.branchId);

  }



  @Get('stock/:id')

  findOneStock(@Param('id') id: string) {

    return this.service.findOneStock(id);

  }



  @Post('stock')

  @AdminRoles()

  createStock(@Body() dto: CreateBrochureStockDto) {

    return this.service.createStock(dto);

  }



  @Put('stock/:id')

  @AdminRoles()

  updateStock(@Param('id') id: string, @Body() dto: UpdateBrochureStockDto) {

    return this.service.updateStock(id, dto);

  }



  @Delete('stock/:id')

  @AdminRoles()

  removeStock(@Param('id') id: string) {

    return this.service.removeStock(id);

  }



  @Get('issues')

  findAllIssues() {

    return this.service.findAllIssues();

  }



  @Post('issue')

  @AdminRoles()

  issueBrochure(@Body() dto: IssueBrochureDto) {

    return this.service.issueBrochure(dto);

  }

}

