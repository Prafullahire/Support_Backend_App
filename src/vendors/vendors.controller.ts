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

import { VendorsService } from './vendors.service';

import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { RolesGuard } from '../common/guards/roles.guard';

import { AdminRoles } from '../common/decorators/roles.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { ScopedUser } from '../common/utils/branch-scope.util';



@ApiTags('vendors')

@ApiBearerAuth()

@UseGuards(JwtAuthGuard, RolesGuard)

@Controller('vendors')

export class VendorsController {

  constructor(private service: VendorsService) {}



  @Get()

  findAll(

    @CurrentUser() _user: ScopedUser,

    @Query('activeOnly') activeOnly?: string,

  ) {

    return this.service.findAll(activeOnly === 'true');

  }



  @Get(':id')

  findOne(@Param('id') id: string) {

    return this.service.findOne(id);

  }



  @Post()

  @AdminRoles()

  create(@Body() dto: CreateVendorDto) {

    return this.service.create(dto);

  }



  @Put(':id')

  @AdminRoles()

  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {

    return this.service.update(id, dto);

  }



  @Delete(':id')

  @AdminRoles()

  remove(@Param('id') id: string) {

    return this.service.remove(id);

  }

}

