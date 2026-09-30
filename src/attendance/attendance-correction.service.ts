import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceCorrectionStatus,
  NotificationType,
  UserRole,
} from '../common/enums';
import { isPrivilegedAdmin } from '../common/constants/roles.constants';
import { resolveBranchFilter, ScopedUser } from '../common/utils/branch-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getAttendanceCorrectionTypeLabel,
  mapCorrectionTypeToAttendanceStatus,
} from './attendance-correction.util';
import {
  CreateAttendanceCorrectionDto,
  ReviewAttendanceCorrectionDto,
} from './dto/attendance-correction.dto';

@Injectable()
export class AttendanceCorrectionService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateAttendanceCorrectionDto) {
    const attendance = await this.prisma.officeBoyAttendance.findUnique({
      where: { id: dto.attendanceId },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!attendance || attendance.userId !== userId) {
      throw new NotFoundException('Attendance record not found');
    }

    if (!attendance.loginTime) {
      throw new BadRequestException('No attendance data available for this date');
    }

    const existingPending = await this.prisma.attendanceCorrectionRequest.findFirst({
      where: {
        attendanceId: dto.attendanceId,
        status: AttendanceCorrectionStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException('A correction request is already pending for this date');
    }

    const request = await this.prisma.attendanceCorrectionRequest.create({
      data: {
        attendanceId: dto.attendanceId,
        userId,
        requestType: dto.requestType as any,
        comments: dto.comments.trim(),
      },
      include: this.requestInclude(),
    });

    await this.notifyAdmins(request, attendance);

    return this.formatRequest(request);
  }

  async findMyRequests(userId: string) {
    const requests = await this.prisma.attendanceCorrectionRequest.findMany({
      where: { userId },
      include: this.requestInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => this.formatRequest(r));
  }

  async findOne(id: string, userId: string, role: UserRole) {
    const request = await this.prisma.attendanceCorrectionRequest.findUnique({
      where: { id },
      include: this.requestInclude(),
    });

    if (!request) {
      throw new NotFoundException('Correction request not found');
    }

    if (!isPrivilegedAdmin(role) && request.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.formatRequest(request);
  }

  async findAllForAdmin(
    user: ScopedUser,
    status?: AttendanceCorrectionStatus,
    requestedBranchId?: string,
  ) {
    const scope = resolveBranchFilter(user, requestedBranchId);
    const requests = await this.prisma.attendanceCorrectionRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(scope.branchId ? { attendance: { branchId: scope.branchId } } : {}),
      },
      include: this.requestInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => this.formatRequest(r));
  }

  async approve(id: string, adminId: string, dto: ReviewAttendanceCorrectionDto) {
    const request = await this.prisma.attendanceCorrectionRequest.findUnique({
      where: { id },
      include: this.requestInclude(),
    });

    if (!request) {
      throw new NotFoundException('Correction request not found');
    }

    if (request.status !== AttendanceCorrectionStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed');
    }

    const updatedStatus = mapCorrectionTypeToAttendanceStatus(request.requestType);

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.attendanceCorrectionRequest.update({
        where: { id },
        data: {
          status: AttendanceCorrectionStatus.APPROVED as any,
          reviewedById: adminId,
          reviewedAt: new Date(),
          adminNotes: dto.adminNotes?.trim() || null,
        },
        include: this.requestInclude(),
      }),
      this.prisma.officeBoyAttendance.update({
        where: { id: request.attendanceId },
        data: {
          status: updatedStatus as any,
          approvedCorrectionType: request.requestType as any,
        },
      }),
    ]);

    await this.notificationsService.create({
      userId: request.userId,
      title: 'Attendance correction approved',
      message: `Your request for ${getAttendanceCorrectionTypeLabel(request.requestType)} on ${this.formatDate(request.attendance.attendanceDate)} was approved.`,
      type: NotificationType.ATTENDANCE_CORRECTION_APPROVED,
      link: '/office-boy/dashboard/checklist',
    });

    return this.formatRequest(updatedRequest);
  }

  async reject(id: string, adminId: string, dto: ReviewAttendanceCorrectionDto) {
    const request = await this.prisma.attendanceCorrectionRequest.findUnique({
      where: { id },
      include: this.requestInclude(),
    });

    if (!request) {
      throw new NotFoundException('Correction request not found');
    }

    if (request.status !== AttendanceCorrectionStatus.PENDING) {
      throw new BadRequestException('This request has already been reviewed');
    }

    const updatedRequest = await this.prisma.attendanceCorrectionRequest.update({
      where: { id },
      data: {
        status: AttendanceCorrectionStatus.REJECTED as any,
        reviewedById: adminId,
        reviewedAt: new Date(),
        adminNotes: dto.adminNotes?.trim() || null,
      },
      include: this.requestInclude(),
    });

    await this.notificationsService.create({
      userId: request.userId,
      title: 'Attendance correction rejected',
      message: `Your request for ${getAttendanceCorrectionTypeLabel(request.requestType)} on ${this.formatDate(request.attendance.attendanceDate)} was rejected.${dto.adminNotes ? ` Note: ${dto.adminNotes}` : ''}`,
      type: NotificationType.ATTENDANCE_CORRECTION_REJECTED,
      link: '/office-boy/dashboard/checklist',
    });

    return this.formatRequest(updatedRequest);
  }

  private async notifyAdmins(
    request: { id: string; requestType: string; comments: string },
    attendance: {
      branchId: string;
      attendanceDate: Date;
      user: { firstName: string; lastName: string };
    },
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: UserRole.SUPER_ADMIN },
          { role: UserRole.ADMIN, branchId: attendance.branchId },
        ],
      },
      select: { id: true },
    });

    const staffName = `${attendance.user.firstName} ${attendance.user.lastName}`;
    const dateLabel = this.formatDate(attendance.attendanceDate);
    const typeLabel = getAttendanceCorrectionTypeLabel(
      request.requestType as Parameters<typeof getAttendanceCorrectionTypeLabel>[0],
    );

    await Promise.all(
      admins.map((admin) =>
        this.notificationsService.create({
          userId: admin.id,
          title: 'Attendance correction request',
          message: `${staffName} requested "${typeLabel}" for ${dateLabel}. Comments: ${request.comments}`,
          type: NotificationType.ATTENDANCE_CORRECTION_REQUEST,
          link: '/attendance-corrections',
        }),
      ),
    );
  }

  private requestInclude() {
    return {
      attendance: {
        include: {
          branch: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          phone: true,
        },
      },
      reviewedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    };
  }

  private formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatRequest(request: {
    id: string;
    attendanceId: string;
    userId: string;
    requestType: any;
    comments: string;
    status: any;
    reviewedAt: Date | null;
    adminNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
    attendance: {
      id: string;
      attendanceDate: Date;
      loginTime: Date | null;
      logoutTime: Date | null;
      workingDurationMinutes: number | null;
      status: string;
      approvedCorrectionType?: any;
      branch: { id: string; name: string } | null;
      location: { id: string; name: string } | null;
    };
    user: {
      id: string;
      firstName: string;
      lastName: string;
      employeeId: string | null;
      phone: string | null;
    };
    reviewedBy: { id: string; firstName: string; lastName: string } | null;
  }) {
    return {
      id: request.id,
      attendanceId: request.attendanceId,
      userId: request.userId,
      requestType: request.requestType,
      requestTypeLabel: getAttendanceCorrectionTypeLabel(request.requestType),
      comments: request.comments,
      status: request.status,
      reviewedAt: request.reviewedAt,
      adminNotes: request.adminNotes,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      staffName: `${request.user.firstName} ${request.user.lastName}`,
      staffEmployeeId: request.user.employeeId,
      staffPhone: request.user.phone,
      attendance: {
        id: request.attendance.id,
        attendanceDate: request.attendance.attendanceDate,
        loginTime: request.attendance.loginTime,
        logoutTime: request.attendance.logoutTime,
        workingDurationMinutes: request.attendance.workingDurationMinutes,
        status: request.attendance.status,
        approvedCorrectionType: request.attendance.approvedCorrectionType,
        branch: request.attendance.branch,
        location: request.attendance.location,
      },
      reviewedBy: request.reviewedBy,
    };
  }
}
