import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';
import { OfficeLocationsService } from './office-locations.service';
import { CreateOfficeLocationDto, UpdateOfficeLocationDto } from './dto/office-location.dto';

@ApiTags('office-locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@AdminRoles()
@Controller('office-locations')
export class OfficeLocationsController {
  constructor(private service: OfficeLocationsService) {}

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
  create(@Body() dto: CreateOfficeLocationDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOfficeLocationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
