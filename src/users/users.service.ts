import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../common/enums';
import {
  assertBranchAccess,
  canAssignRole,
  enforceActorBranchId,
  resolveBranchFilter,
  ScopedUser,
} from '../common/utils/branch-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { deleteUserRelations } from '../common/utils/user-cleanup.util';
import {
  generateEmployeeId,
  generateOfficeBoyEmail,
  normalizePhone,
} from '../common/utils/office-boy.util';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserWelcomeNotificationService } from './user-welcome-notification.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private welcomeNotificationService: UserWelcomeNotificationService,
  ) {}

  findAll(actor?: ScopedUser) {
    const where = actor ? resolveBranchFilter(actor) : {};
    return this.prisma.user.findMany({
      where,
      select: this.select(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor?: ScopedUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: this.select() });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (actor) {
      assertBranchAccess(actor, user.branchId);
    }
    return user;
  }

  async create(dto: CreateUserDto, actor?: ScopedUser) {
    const role = dto.role ?? UserRole.ADMIN;

    if (actor && !canAssignRole(actor, role)) {
      throw new ForbiddenException('You cannot assign this role');
    }

    const branchId = actor ? enforceActorBranchId(actor, dto.branchId) : dto.branchId;

    if (role !== UserRole.OFFICE_BOY && !dto.email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    if (role === UserRole.OFFICE_BOY) {
      if (!dto.phone?.trim()) {
        throw new BadRequestException('Phone number is required for Office Boy role');
      }
      if (!branchId) {
        throw new BadRequestException('Branch is required for Office Boy role');
      }
      const officeLocationId =
        dto.officeLocationId || (await this.resolveDefaultLocation(branchId));
      await this.validateOfficeBoyFields({
        phone: dto.phone,
        branchId,
        officeLocationId,
      });
      const email = dto.email?.trim() || generateOfficeBoyEmail(dto.phone);
      const employeeId = dto.employeeId?.trim() || generateEmployeeId(dto.phone);
      await this.validateUnique(email, employeeId);
      await this.validatePhoneUnique(dto.phone);
    }

    const password = await bcrypt.hash(dto.password, 10);
    const data = await this.buildUserData({ ...dto, role, branchId }, password);

    const user = await this.prisma.user.create({
      data,
      select: this.select(),
    });

    void this.welcomeNotificationService.sendWelcomeNotifications(user as any).catch(() => undefined);

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor?: ScopedUser) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (actor) {
      assertBranchAccess(actor, existing.branchId);
    }

    const nextRole = dto.role ?? existing.role;

    if (actor && dto.role && !canAssignRole(actor, nextRole as any)) {
      throw new ForbiddenException('You cannot assign this role');
    }

    const { password, joiningDate, leavingDate, address, branchId, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };

    if (branchId !== undefined) {
      data.branchId = actor ? enforceActorBranchId(actor, branchId) : branchId;
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }
    if (joiningDate !== undefined) {
      data.joiningDate = joiningDate ? new Date(joiningDate) : null;
    }
    if (leavingDate !== undefined) {
      data.leavingDate = leavingDate ? new Date(leavingDate) : null;
    }
    if (address !== undefined) {
      data.address = address?.trim() || null;
    }

    if (nextRole === UserRole.OFFICE_BOY) {
      const phone = dto.phone ? normalizePhone(dto.phone) : existing.phone;
      const branchId = dto.branchId ?? existing.branchId;
      let officeLocationId = dto.officeLocationId ?? existing.officeLocationId;
      if (!officeLocationId && branchId) {
        officeLocationId = await this.resolveDefaultLocation(branchId);
      }
      await this.validateOfficeBoyFields({
        phone,
        branchId,
        officeLocationId,
      });
      const employeeId =
        dto.employeeId ?? existing.employeeId ?? (phone ? generateEmployeeId(phone) : null);
      if (dto.email || dto.employeeId || phone) {
        await this.validateUnique(dto.email ?? existing.email, employeeId!, id);
      }
      if (dto.phone) {
        await this.validatePhoneUnique(normalizePhone(dto.phone), id);
        data.phone = normalizePhone(dto.phone);
      }
      data.departmentId = null;
      data.officeLocationId = officeLocationId;
      data.employeeId = employeeId;
    } else if (dto.role && dto.role !== UserRole.OFFICE_BOY) {
      data.employeeId = null;
      data.officeLocationId = null;
      data.joiningDate = null;
      data.leavingDate = null;
      data.address = null;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.select(),
    });
  }

  async remove(id: string, actor?: ScopedUser) {
    const user = await this.findOne(id, actor);

    try {
      await this.prisma.$transaction(async (tx) => {
        await deleteUserRelations(tx, id);
        await tx.user.delete({ where: { id } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'Cannot delete user because related records still exist. Deactivate the user instead.',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
      }
      throw error;
    }

    return user;
  }

  private async buildUserData(dto: CreateUserDto & { role: UserRole }, password: string) {
    const isOfficeBoy = dto.role === UserRole.OFFICE_BOY;
    const phone = dto.phone?.trim();
    const email = isOfficeBoy
      ? dto.email?.trim() || generateOfficeBoyEmail(phone!)
      : dto.email!.trim();
    const employeeId = isOfficeBoy
      ? dto.employeeId?.trim() || generateEmployeeId(phone!)
      : null;
    let officeLocationId = isOfficeBoy ? dto.officeLocationId : null;
    if (isOfficeBoy && !officeLocationId && dto.branchId) {
      officeLocationId = await this.resolveDefaultLocation(dto.branchId);
    }

    return {
      email,
      password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: isOfficeBoy ? normalizePhone(phone!) : dto.phone,
      role: dto.role,
      branchId: dto.branchId,
      departmentId: isOfficeBoy ? null : dto.departmentId,
      employeeId,
      officeLocationId,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
      leavingDate: dto.leavingDate ? new Date(dto.leavingDate) : null,
      address: dto.address?.trim() || null,
    };
  }

  private async resolveDefaultLocation(branchId: string) {
    const location = await this.prisma.officeLocation.findFirst({
      where: { branchId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!location) {
      throw new BadRequestException(
        'No office location found for this branch. Create one in Office Locations first.',
      );
    }
    return location.id;
  }

  private async validateOfficeBoyFields(fields: {
    phone?: string | null;
    branchId?: string | null;
    officeLocationId?: string | null;
    employeeId?: string | null;
  }) {
    if (!fields.phone?.trim()) {
      throw new BadRequestException('Phone number is required for Office Boy role');
    }
    if (!fields.branchId) {
      throw new BadRequestException('Branch is required for Office Boy role');
    }
    if (!fields.officeLocationId) {
      throw new BadRequestException('Office location is required for Office Boy role');
    }

    const location = await this.prisma.officeLocation.findUnique({
      where: { id: fields.officeLocationId },
    });
    if (!location || !location.isActive) {
      throw new NotFoundException('Office location not found or inactive');
    }
    if (location.branchId !== fields.branchId) {
      throw new ConflictException('Office location does not belong to the selected branch');
    }
  }

  private async validatePhoneUnique(phone: string, excludeId?: string) {
    const normalized = normalizePhone(phone);
    const users = await this.prisma.user.findMany({
      where: {
        role: UserRole.OFFICE_BOY,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true, phone: true },
    });
    const duplicate = users.find((u) => u.phone && normalizePhone(u.phone) === normalized);
    if (duplicate) {
      throw new ConflictException('Phone number already in use');
    }
  }

  private async validateUnique(email: string, employeeId: string, excludeId?: string) {
    const emailExists = await this.prisma.user.findFirst({
      where: { email, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (emailExists) throw new ConflictException('Email already in use');

    const empExists = await this.prisma.user.findFirst({
      where: { employeeId, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (empExists) throw new ConflictException('Employee ID already in use');
  }

  private select() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      branchId: true,
      departmentId: true,
      employeeId: true,
      officeLocationId: true,
      joiningDate: true,
      leavingDate: true,
      address: true,
      isActive: true,
      createdAt: true,
      branch: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      officeLocation: { select: { id: true, name: true } },
    };
  }
}
