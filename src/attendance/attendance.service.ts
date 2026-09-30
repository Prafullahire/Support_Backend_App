import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AttendanceActivityType,
  AttendanceCorrectionStatus,
  AttendanceStatus,
  UserRole,
} from '../common/enums';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  calculateWorkingDurationMinutes,
  formatDuration,
  formatDistanceMeters,
  getAttendancePeriodRange,
  getCustomDateRange,
  getEndOfDay,
  getStartOfDay,
  isWithinRadius,
  resolveAttendanceStatusFromDuration,
  isLateCheckIn,
  isEarlyLeaveLogout,
  formatAttendanceStatusLabel,
  getTotalWorkingMinutes,
  isAttendanceDayComplete,
  canResumeAttendanceToday,
} from '../common/utils/geo.util';
import { getAttendanceCorrectionTypeLabel } from './attendance-correction.util';
import { normalizePhone } from '../common/utils/office-boy.util';
import { toJsonValue } from '../common/utils/serialize.util';
import {
  AttendanceFilterDto,
  OfficeBoyCheckInDto,
  OfficeBoyLoginDto,
  OfficeBoyLogoutDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private cloudinary: CloudinaryService,
  ) {}

  async officeBoyLogin(dto: OfficeBoyLoginDto) {
    if (dto.latitude == null || dto.longitude == null) {
      await this.logActivity(null, AttendanceActivityType.LOGIN_LOCATION_PERMISSION_DENIED, dto, 'GPS coordinates missing');
      throw new BadRequestException(
        'Location permission is required to login. Please enable location permission and try again.',
      );
    }

    const user = await this.findOfficeBoyByLoginId(dto.loginId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const officeBoyUser = await this.ensureOfficeBoyLocation(user);

    const existing = await this.findTodayAttendance(officeBoyUser.id);

    const loginNote = existing?.logoutTime
      ? 'Re-authenticated (attendance completed)'
      : existing?.isSessionActive
        ? 'Re-authenticated (session active)'
        : existing?.loginTime
          ? 'Re-authenticated (awaiting sign out)'
          : 'Login successful (awaiting sign in)';

    await this.logActivity(
      officeBoyUser.id,
      AttendanceActivityType.LOGIN_SUCCESS,
      dto,
      loginNote,
    );

    const tokens = await this.authService.issueTokensForUser(officeBoyUser.id);
    return toJsonValue({
      ...tokens,
      attendance: existing ? this.formatAttendance(existing) : null,
    });
  }

  private async findOfficeBoyByLoginId(loginId: string) {
    const trimmed = loginId.trim();
    const normalizedPhone = normalizePhone(trimmed);

    const direct = await this.prisma.user.findFirst({
      where: {
        role: UserRole.OFFICE_BOY,
        OR: [
          { email: trimmed },
          { employeeId: trimmed },
          { phone: trimmed },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
      include: {
        branch: true,
        officeLocation: true,
      },
    });
    if (direct) return direct;

    if (!normalizedPhone) return null;

    const phoneUsers = await this.prisma.user.findMany({
      where: { role: UserRole.OFFICE_BOY, phone: { not: null } },
      include: { branch: true, officeLocation: true },
    });
    return phoneUsers.find((u) => u.phone && normalizePhone(u.phone) === normalizedPhone) ?? null;
  }

  private async ensureOfficeBoyLocation(user: {
    id: string;
    branchId: string | null;
    officeLocationId: string | null;
    branch?: { id: string; name: string } | null;
    officeLocation: {
      id: string;
      isActive: boolean;
      latitude: unknown;
      longitude: unknown;
      allowedRadiusMeters: number;
      name?: string;
    } | null;
  }) {
    if (user.officeLocationId && user.officeLocation?.isActive) {
      return user;
    }

    if (!user.branchId) {
      throw new BadRequestException(
        'No branch assigned. Ask admin to edit your profile and set a branch.',
      );
    }

    const location = await this.prisma.officeLocation.findFirst({
      where: { branchId: user.branchId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!location) {
      const branchName = user.branch?.name || 'your branch';
      throw new BadRequestException(
        `No office location configured for ${branchName}. Ask admin to create one under Office Locations and assign it to you.`,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { officeLocationId: location.id },
    });

    return {
      ...user,
      officeLocationId: location.id,
      officeLocation: location,
    };
  }

  async officeBoyCheckIn(
    userId: string,
    dto: OfficeBoyCheckInDto,
  ) {
    if (dto.latitude == null || dto.longitude == null) {
      await this.logActivity(userId, AttendanceActivityType.LOGIN_LOCATION_PERMISSION_DENIED, dto, 'GPS coordinates missing');
      throw new BadRequestException(
        'Location permission is required to login. Please enable location permission and try again.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: true,
        officeLocation: true,
      },
    });

    if (!user || user.role !== UserRole.OFFICE_BOY || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    const officeBoyUser = await this.ensureOfficeBoyLocation(user);

    const loginPhotoUrl = await this.uploadAttendancePhoto(
      dto.photo,
      userId,
      'check-in',
    );

    const attendance = await this.recordCheckIn(officeBoyUser, dto, dto, loginPhotoUrl);
    await this.logActivity(userId, AttendanceActivityType.LOGIN_SUCCESS, dto, 'Check-in successful', attendance.loginDistanceMeters ?? undefined);

    return toJsonValue({
      attendance: this.formatAttendance(attendance),
    });
  }

  private async recordCheckIn(
    user: {
      id: string;
      branchId: string | null;
      officeLocationId: string | null;
      officeLocation: {
        isActive: boolean;
        latitude: unknown;
        longitude: unknown;
        allowedRadiusMeters: number;
        name?: string;
      } | null;
    },
    coords: { latitude: number; longitude: number; deviceInfo?: string; lateReason?: string },
    logCoords: { latitude: number; longitude: number },
    loginPhotoUrl?: string | null,
  ) {
    if (!user.officeLocationId || !user.officeLocation?.isActive) {
      throw new BadRequestException(
        'No office location assigned. Admin must edit this user, set Role to Office Boy, and select Branch + Office Location.',
      );
    }

    if (!user.branchId) {
      throw new BadRequestException('No branch assigned. Contact admin.');
    }

    const location = user.officeLocation;
    const { allowed, distanceMeters } = isWithinRadius(
      coords.latitude,
      coords.longitude,
      Number(location.latitude),
      Number(location.longitude),
      location.allowedRadiusMeters,
    );

    if (!allowed) {
      await this.logActivity(user.id, AttendanceActivityType.LOGIN_LOCATION_REJECTED, logCoords, `Distance: ${distanceMeters}m`, distanceMeters);
      const officeName = location.name || 'assigned office';
      throw new ForbiddenException(
        `You are ${formatDistanceMeters(distanceMeters)} from ${officeName} (allowed: ${location.allowedRadiusMeters} m). ` +
          'Move closer to the office or ask admin to update the office location coordinates in Office Locations.',
      );
    }

    const today = getStartOfDay();
    const existing = await this.findTodayAttendance(user.id);

    if (existing?.isSessionActive) {
      await this.logActivity(user.id, AttendanceActivityType.LOGIN_ALREADY_ACTIVE, logCoords, 'Already logged in today');
      throw new BadRequestException('You are already logged in.');
    }

    if (existing?.logoutTime && !canResumeAttendanceToday(existing)) {
      throw new BadRequestException('Today\'s attendance is already completed.');
    }

    const now = new Date();
    const isLate = isLateCheckIn(now);
    const lateReason = coords.lateReason?.trim();
    const resumingAfterEarlyLeave = Boolean(existing?.logoutTime);
    const mergedIsLate = (existing?.isLate ?? false) || isLate;
    const mergedLateReason = existing?.lateReason ?? (isLate ? lateReason : null);

    if (isLate && !existing?.lateReason && !lateReason) {
      throw new BadRequestException(
        'You are late. Please provide a reason for late arrival before signing in.',
      );
    }

    const accumulatedMinutes = resumingAfterEarlyLeave
      ? (existing?.workingDurationMinutes ?? 0)
      : 0;

    const checkInData = {
      loginTime: now,
      logoutTime: null,
      logoutLatitude: null,
      logoutLongitude: null,
      logoutDistanceMeters: null,
      loginLatitude: coords.latitude,
      loginLongitude: coords.longitude,
      loginDistanceMeters: distanceMeters,
      isSessionActive: true,
      status: AttendanceStatus.INCOMPLETE,
      isLate: mergedIsLate,
      lateReason: mergedLateReason,
      isEarlyLeave: false,
      earlyLeaveReason: resumingAfterEarlyLeave ? existing?.earlyLeaveReason ?? null : null,
      workingDurationMinutes: resumingAfterEarlyLeave ? accumulatedMinutes : null,
      deviceInfo: coords.deviceInfo,
      branchId: user.branchId!,
      locationId: user.officeLocationId,
      ...(loginPhotoUrl ? { loginPhotoUrl } : {}),
    };

    if (existing) {
      return this.prisma.officeBoyAttendance.update({
        where: { id: existing.id },
        data: checkInData,
        include: this.attendanceInclude(),
      });
    }

    try {
      return await this.prisma.officeBoyAttendance.create({
        data: {
          userId: user.id,
          attendanceDate: today,
          ...checkInData,
        },
        include: this.attendanceInclude(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const fallback = await this.findTodayAttendance(user.id);
        if (!fallback) throw error;
        if (fallback.isSessionActive) {
          throw new BadRequestException('You are already logged in.');
        }
        if (fallback.logoutTime && !canResumeAttendanceToday(fallback)) {
          throw new BadRequestException('Today\'s attendance is already completed.');
        }
        return this.prisma.officeBoyAttendance.update({
          where: { id: fallback.id },
          data: checkInData,
          include: this.attendanceInclude(),
        });
      }
      throw error;
    }
  }

  async officeBoyLogout(userId: string, dto: OfficeBoyLogoutDto) {
    if (dto.latitude == null || dto.longitude == null) {
      await this.logActivity(userId, AttendanceActivityType.LOGOUT_LOCATION_PERMISSION_DENIED, dto, 'GPS missing');
      throw new BadRequestException(
        'Location permission is required to logout. Please enable location permission and try again.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { officeLocation: true },
    });

    if (!user || user.role !== UserRole.OFFICE_BOY || !user.isActive) {
      throw new UnauthorizedException('Invalid user');
    }

    if (!user.officeLocation) {
      throw new BadRequestException('No office location assigned.');
    }

    const location = user.officeLocation;
    const { allowed, distanceMeters } = isWithinRadius(
      dto.latitude,
      dto.longitude,
      Number(location.latitude),
      Number(location.longitude),
      location.allowedRadiusMeters,
    );

    if (!allowed) {
      await this.logActivity(userId, AttendanceActivityType.LOGOUT_LOCATION_REJECTED, dto, `Distance: ${distanceMeters}m`, distanceMeters);
      throw new ForbiddenException(
        `You are ${formatDistanceMeters(distanceMeters)} from ${location.name} (allowed: ${location.allowedRadiusMeters} m). ` +
          'Move closer to the office or ask admin to update the office location coordinates.',
      );
    }

    const attendance = await this.findTodayAttendance(userId);

    if (!attendance || !attendance.loginTime) {
      await this.logActivity(userId, AttendanceActivityType.LOGOUT_WITHOUT_LOGIN, dto, 'No active login');
      throw new BadRequestException('No active login session found for today.');
    }

    if (!attendance.isSessionActive || attendance.logoutTime) {
      await this.logActivity(userId, AttendanceActivityType.LOGOUT_ALREADY_COMPLETED, dto, 'Already logged out');
      throw new BadRequestException('You have already logged out for today.');
    }

    const now = new Date();
    const accumulatedMinutes = attendance.workingDurationMinutes ?? 0;
    const sessionMinutes = calculateWorkingDurationMinutes(attendance.loginTime, now);
    const workingDurationMinutes = accumulatedMinutes + sessionMinutes;
    const dayStatus = resolveAttendanceStatusFromDuration(workingDurationMinutes);
    const isEarlyLeave = isEarlyLeaveLogout(
      attendance.loginTime,
      now,
      accumulatedMinutes,
    );
    const earlyLeaveReason = dto.earlyLeaveReason?.trim();

    if (isEarlyLeave && !earlyLeaveReason) {
      throw new BadRequestException(
        'You are leaving before completing 9 working hours. Please provide a reason before signing out.',
      );
    }

    const logoutPhotoUrl = await this.uploadAttendancePhoto(
      dto.photo,
      userId,
      'check-out',
    );

    const updated = await this.prisma.officeBoyAttendance.update({
      where: { id: attendance.id },
      data: {
        logoutTime: now,
        logoutLatitude: dto.latitude,
        logoutLongitude: dto.longitude,
        logoutDistanceMeters: distanceMeters,
        workingDurationMinutes,
        isSessionActive: false,
        status: dayStatus as AttendanceStatus,
        isEarlyLeave,
        earlyLeaveReason: isEarlyLeave ? earlyLeaveReason : null,
        deviceInfo: dto.deviceInfo ?? attendance.deviceInfo,
        ...(logoutPhotoUrl ? { logoutPhotoUrl } : {}),
      },
      include: this.attendanceInclude(),
    });

    await this.logActivity(userId, AttendanceActivityType.LOGOUT_SUCCESS, dto, 'Logout successful', distanceMeters);

    return toJsonValue({
      message: 'Logout successful',
      attendance: this.formatAttendance(updated),
    });
  }

  async getMyDashboard(userId: string) {
    await this.prisma.officeBoyAttendance.updateMany({
      where: {
        userId,
        isSessionActive: true,
        attendanceDate: { lt: getStartOfDay() },
        logoutTime: null,
      },
      data: {
        isSessionActive: false,
        status: AttendanceStatus.INCOMPLETE,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        branch: { select: { id: true, name: true } },
        officeLocation: { select: { id: true, name: true, allowedRadiusMeters: true } },
      },
    });

    const todayAttendance = await this.findTodayAttendance(userId);

    const history = await this.prisma.officeBoyAttendance.findMany({
      where: { userId },
      include: this.attendanceInclude(),
      orderBy: { attendanceDate: 'desc' },
      take: 30,
    });

    return toJsonValue({
      user,
      todayAttendance: todayAttendance ? this.formatAttendance(todayAttendance) : null,
      history: history.map((a) => this.formatAttendance(a)),
      isLoggedIn: todayAttendance?.isSessionActive ?? false,
    });
  }

  async getMyHistory(userId: string, filters: AttendanceFilterDto) {
    const where = this.buildFilterWhere(filters, userId);
    const records = await this.prisma.officeBoyAttendance.findMany({
      where,
      include: this.attendanceInclude(),
      orderBy: { attendanceDate: 'desc' },
    });
    return records.map((a) => this.formatAttendance(a));
  }

  async getAllAttendance(filters: AttendanceFilterDto) {
    const where = this.buildFilterWhere(filters);
    const records = await this.prisma.officeBoyAttendance.findMany({
      where,
      include: {
        ...this.attendanceInclude(),
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ attendanceDate: 'desc' }, { loginTime: 'desc' }],
    });
    return records.map((a) => ({
      ...this.formatAttendance(a),
      staffName: `${a.user.firstName} ${a.user.lastName}`,
      staffEmployeeId: a.user.employeeId,
      staffEmail: a.user.email,
      staffPhone: a.user.phone,
    }));
  }

  async getActivityLogs(userId?: string) {
    return this.prisma.attendanceActivityLog.findMany({
      where: userId ? { userId } : {},
      include: {
        user: { select: { firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private buildFilterWhere(filters: AttendanceFilterDto, userId?: string) {
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status === 'FULL_DAY') {
      where.status = { in: ['FULL_DAY', 'PRESENT'] };
    } else if (filters.status) {
      where.status = filters.status;
    }

    const dateFilter = this.resolveDateFilter(filters);
    if (dateFilter) {
      where.attendanceDate = dateFilter;
    }

    return where;
  }

  private resolveDateFilter(filters: AttendanceFilterDto) {
    if (filters.period === 'today' || filters.period === 'yesterday' || filters.period === 'week' || filters.period === 'month') {
      const { gte, lt } = getAttendancePeriodRange(filters.period);
      return { gte, lt };
    }

    if (filters.startDate && filters.endDate) {
      return getCustomDateRange(filters.startDate, filters.endDate);
    }

    return undefined;
  }

  private async findTodayAttendance(userId: string) {
    const today = getStartOfDay();
    const tomorrow = getEndOfDay();

    const byUnique = await this.prisma.officeBoyAttendance.findUnique({
      where: { userId_attendanceDate: { userId, attendanceDate: today } },
      include: this.attendanceInclude(),
    });
    if (byUnique) return byUnique;

    return this.prisma.officeBoyAttendance.findFirst({
      where: {
        userId,
        attendanceDate: { gte: today, lt: tomorrow },
      },
      include: this.attendanceInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  private attendanceInclude() {
    return {
      branch: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      correctionRequests: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
    };
  }

  private formatAttendance(attendance: {
    id: string;
    attendanceDate: Date;
    loginTime: Date | null;
    logoutTime: Date | null;
    loginLatitude?: unknown;
    loginLongitude?: unknown;
    logoutLatitude?: unknown;
    logoutLongitude?: unknown;
    loginDistanceMeters: number | null;
    logoutDistanceMeters: number | null;
    workingDurationMinutes: number | null;
    status: any;
    isLate?: boolean;
    lateReason?: string | null;
    isEarlyLeave?: boolean;
    earlyLeaveReason?: string | null;
    isSessionActive: boolean;
    loginPhotoUrl?: string | null;
    logoutPhotoUrl?: string | null;
    approvedCorrectionType?: string | null;
    branch?: { id: string; name: string } | null;
    location?: { id: string; name: string } | null;
    correctionRequests?: Array<{
      id: string;
      requestType: string;
      comments: string;
      status: any;
      adminNotes?: string | null;
      createdAt: Date;
    }>;
  }) {
    const isLate = attendance.isLate ?? false;
    const totalWorkingMinutes = getTotalWorkingMinutes(attendance);
    const isDayComplete = isAttendanceDayComplete(attendance);
    const canSignInAgain = canResumeAttendanceToday(attendance);
    const latestCorrection = attendance.correctionRequests?.[0];
    const approvedCorrectionType = attendance.approvedCorrectionType ?? null;
    let statusLabel = formatAttendanceStatusLabel(attendance.status, isLate);
    if (approvedCorrectionType) {
      statusLabel = getAttendanceCorrectionTypeLabel(
        approvedCorrectionType as Parameters<typeof getAttendanceCorrectionTypeLabel>[0],
      );
    } else if (latestCorrection?.status === AttendanceCorrectionStatus.PENDING) {
      statusLabel = 'Pending Approval';
    }
    return {
      id: attendance.id,
      attendanceDate: attendance.attendanceDate,
      loginTime: attendance.loginTime,
      logoutTime: attendance.logoutTime,
      loginLatitude: attendance.loginLatitude != null ? Number(attendance.loginLatitude) : null,
      loginLongitude: attendance.loginLongitude != null ? Number(attendance.loginLongitude) : null,
      logoutLatitude: attendance.logoutLatitude != null ? Number(attendance.logoutLatitude) : null,
      logoutLongitude: attendance.logoutLongitude != null ? Number(attendance.logoutLongitude) : null,
      loginDistanceMeters: attendance.loginDistanceMeters,
      logoutDistanceMeters: attendance.logoutDistanceMeters,
      workingDurationMinutes: attendance.workingDurationMinutes,
      totalWorkingMinutes,
      status: attendance.status,
      statusLabel,
      approvedCorrectionType,
      correctionRequest: latestCorrection
        ? {
            id: latestCorrection.id,
            requestType: latestCorrection.requestType,
            requestTypeLabel: getAttendanceCorrectionTypeLabel(
              latestCorrection.requestType as Parameters<typeof getAttendanceCorrectionTypeLabel>[0],
            ),
            comments: latestCorrection.comments,
            status: latestCorrection.status,
            adminNotes: latestCorrection.adminNotes ?? null,
            createdAt: latestCorrection.createdAt,
          }
        : null,
      isLate,
      lateReason: attendance.lateReason ?? null,
      isEarlyLeave: attendance.isEarlyLeave ?? false,
      earlyLeaveReason: attendance.earlyLeaveReason ?? null,
      isSessionActive: attendance.isSessionActive,
      loginPhotoUrl: attendance.loginPhotoUrl ?? null,
      logoutPhotoUrl: attendance.logoutPhotoUrl ?? null,
      isDayComplete,
      canSignInAgain,
      branch: attendance.branch,
      location: attendance.location,
      workingDurationFormatted:
        totalWorkingMinutes > 0 || attendance.isSessionActive
          ? formatDuration(totalWorkingMinutes)
          : null,
    };
  }

  private async uploadAttendancePhoto(
    photo: string | undefined,
    userId: string,
    type: 'check-in' | 'check-out',
  ) {
    if (!photo?.trim()) {
      return null;
    }

    const today = getStartOfDay().toISOString().slice(0, 10);
    return this.cloudinary.uploadBase64Image(
      photo,
      `support-app/attendance/${userId}`,
      `${today}-${type}`,
    );
  }

  private async logActivity(
    userId: string | null,
    action: AttendanceActivityType,
    coords: { latitude: number; longitude: number },
    message: string,
    distanceMeters?: number,
  ) {
    if (!userId) return;
    await this.prisma.attendanceActivityLog.create({
      data: {
        userId,
        action,
        latitude: coords.latitude,
        longitude: coords.longitude,
        distanceMeters,
        message,
      },
    });
  }
}
