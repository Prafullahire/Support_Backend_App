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
import { UserRole } from '../common/enums';
import { CourierService } from './courier.service';
import {
  CreateCourierDto,
  UpdateCourierDto,
  UpdateCourierStatusDto,
} from './dto/courier.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';

@ApiTags('courier')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courier')
export class CourierController {
  constructor(private service: CourierService) {}

  @Get()
  findAll(
    @CurrentUser() user: ScopedUser,
    @Query('branchId') branchId?: string,
  ) {
    const scope = resolveBranchFilter(user, branchId);
    return this.service.findAll(user.id, user.role, scope.branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.service.findOne(id, user.id, user.role);
  }

  @Post()
  create(@Body() dto: CreateCourierDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourierDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.service.update(id, dto, user.id, user.role);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCourierStatusDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.service.updateStatus(id, dto, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.service.remove(id, user.id, user.role);
  }
}
