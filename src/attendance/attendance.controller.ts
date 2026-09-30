import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceCorrectionStatus, UserRole } from '../common/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminRoles, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ScopedUser } from '../common/utils/branch-scope.util';
import { AttendanceService } from './attendance.service';
import { AttendanceCorrectionService } from './attendance-correction.service';
import {
  AttendanceFilterDto,
  OfficeBoyLoginDto,
  OfficeBoyLogoutDto,
  OfficeBoyCheckInDto,
} from './dto/attendance.dto';
import {
  CreateAttendanceCorrectionDto,
  ReviewAttendanceCorrectionDto,
} from './dto/attendance-correction.dto';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(
    private service: AttendanceService,
    private correctionService: AttendanceCorrectionService,
  ) {}

  @Post('office-boy/login')
  officeBoyLogin(@Body() dto: OfficeBoyLoginDto) {
    return this.service.officeBoyLogin(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE_BOY)
  @Post('office-boy/check-in')
  officeBoyCheckIn(
    @CurrentUser('id') userId: string,
    @Body() dto: OfficeBoyCheckInDto,
  ) {
    return this.service.officeBoyCheckIn(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE_BOY)
  @Post('office-boy/logout')
  officeBoyLogout(
    @CurrentUser('id') userId: string,
    @Body() dto: OfficeBoyLogoutDto,
  ) {
    return this.service.officeBoyLogout(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE_BOY)
  @Get('office-boy/dashboard')
  getDashboard(@CurrentUser('id') userId: string) {
    return this.service.getMyDashboard(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE_BOY)
  @Get('office-boy/history')
  getMyHistory(@CurrentUser('id') userId: string, @Query() filters: AttendanceFilterDto) {
    return this.service.getMyHistory(userId, filters);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRoles()
  @Get()
  getAll(@Query() filters: AttendanceFilterDto) {
    return this.service.getAllAttendance(filters);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRoles()
  @Get('activity-logs')
  getActivityLogs(@Query('userId') userId?: string) {
    return this.service.getActivityLogs(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE_BOY)
  @Post('corrections')
  createCorrection(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAttendanceCorrectionDto,
  ) {
    return this.correctionService.create(userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OFFICE_BOY)
  @Get('corrections/my')
  getMyCorrections(@CurrentUser('id') userId: string) {
    return this.correctionService.findMyRequests(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRoles()
  @Get('corrections')
  getAllCorrections(
    @CurrentUser() user: ScopedUser,
    @Query('status') status?: AttendanceCorrectionStatus,
    @Query('branchId') branchId?: string,
  ) {
    return this.correctionService.findAllForAdmin(user, status, branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('corrections/:id')
  getCorrection(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.correctionService.findOne(id, userId, role);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRoles()
  @Patch('corrections/:id/approve')
  approveCorrection(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewAttendanceCorrectionDto,
  ) {
    return this.correctionService.approve(id, adminId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminRoles()
  @Patch('corrections/:id/reject')
  rejectCorrection(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewAttendanceCorrectionDto,
  ) {
    return this.correctionService.reject(id, adminId, dto);
  }
}
