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

import { AssetStatus } from '../common/enums';

import { AssetsService } from './assets.service';

import {

  AssignAssetDto,

  CreateAssetCategoryDto,

  CreateAssetDto,

  ReturnAssetDto,

  UpdateAssetCategoryDto,

  UpdateAssetDto,

} from './dto/asset.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('assets')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('assets')

export class AssetsController {

  constructor(private service: AssetsService) {}



  @Get()

  findAll(

    @CurrentUser() user: ScopedUser,

    @Query('branchId') branchId?: string,

    @Query('status') status?: AssetStatus,

  ) {

    const scope = resolveBranchFilter(user, branchId);

    return this.service.findAll(scope.branchId, status);

  }



  @Get('categories')

  findAllCategories() {

    return this.service.findAllCategories();

  }



  @Post('categories')

  @AdminRoles()

  createCategory(@Body() dto: CreateAssetCategoryDto) {

    return this.service.createCategory(dto);

  }



  @Put('categories/:id')

  @AdminRoles()

  updateCategory(@Param('id') id: string, @Body() dto: UpdateAssetCategoryDto) {

    return this.service.updateCategory(id, dto);

  }



  @Get(':id')

  findOne(@Param('id') id: string) {

    return this.service.findOne(id);

  }



  @Post()

  @AdminRoles()

  create(@Body() dto: CreateAssetDto) {

    return this.service.create(dto);

  }



  @Put(':id')

  @AdminRoles()

  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {

    return this.service.update(id, dto);

  }



  @Delete(':id')

  @AdminRoles()

  remove(@Param('id') id: string) {

    return this.service.remove(id);

  }



  @Post(':id/assign')

  @AdminRoles()

  assign(@Param('id') id: string, @Body() dto: AssignAssetDto) {

    return this.service.assign(id, dto);

  }



  @Post(':id/return')

  @AdminRoles()

  returnAsset(@Param('id') id: string, @Body() dto: ReturnAssetDto) {

    return this.service.returnAsset(id, dto);

  }

}

