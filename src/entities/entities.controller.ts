import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { CreateEntityDto, UpdateEntityDto } from './dto/entity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminRoles } from '../common/decorators/roles.decorator';

@ApiTags('entities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('entities')
export class EntitiesController {
  constructor(private service: EntitiesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @AdminRoles()
  create(@Body() dto: CreateEntityDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @AdminRoles()
  update(@Param('id') id: string, @Body() dto: UpdateEntityDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @AdminRoles()
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
