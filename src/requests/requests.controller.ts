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
import { UserRole } from '../common/enums';
import { RequestsService } from './requests.service';
import { CreateRequestDto, UpdateRequestDto } from './dto/request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private service: RequestsService) {}

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
  create(@Body() dto: CreateRequestDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.service.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.service.remove(id, user.id, user.role);
  }

  @Put(':id/assign')
  @AdminRoles()
  assign(
    @Param('id') id: string,
    @Body('assignedToId') assignedToId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.service.update(id, { assignedToId }, user.id, user.role);
  }
}
