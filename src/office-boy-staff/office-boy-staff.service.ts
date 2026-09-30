import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../common/enums';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  generateEmployeeId,
  generateOfficeBoyEmail,
  normalizePhone,
} from '../common/utils/office-boy.util';
import { CreateOfficeBoyStaffDto, UpdateOfficeBoyStaffDto } from './dto/office-boy-staff.dto';

@Injectable()
export class OfficeBoyStaffService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  findAll(branchId?: string) {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.OFFICE_BOY,
        ...(branchId ? { branchId } : {}),
      },
      select: this.select(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: UserRole.OFFICE_BOY },
      select: this.select(),
    });
    if (!user) throw new NotFoundException('Office Boy staff not found');
    return user;
  }

  async create(dto: CreateOfficeBoyStaffDto) {
    const phone = normalizePhone(dto.phone.trim());
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    const email = dto.email?.trim() || generateOfficeBoyEmail(phone);
    const employeeId = dto.employeeId?.trim() || generateEmployeeId(phone);
    const officeLocationId =
      dto.officeLocationId || (await this.resolveDefaultLocation(dto.branchId));

    await this.validateUnique(email, employeeId);
    await this.validatePhoneUnique(phone);
    await this.validateLocationBranch(officeLocationId, dto.branchId);

    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone,
        employeeId,
        role: UserRole.OFFICE_BOY,
        branchId: dto.branchId,
        officeLocationId,
        isActive: dto.isActive ?? true,
      },
      select: this.select(),
    });
  }

  async update(id: string, dto: UpdateOfficeBoyStaffDto) {
    const existing = await this.findOne(id);

    const email = dto.email ?? existing.email;
    const employeeId = dto.employeeId ?? existing.employeeId!;
    if (dto.email || dto.employeeId) {
      await this.validateUnique(email, employeeId, id);
    }

    if (dto.phone && dto.phone !== existing.phone) {
      await this.validatePhoneUnique(normalizePhone(dto.phone), id);
    }

    const branchId = dto.branchId ?? existing.branchId!;
    const officeLocationId = dto.officeLocationId ?? existing.officeLocationId;

    if (officeLocationId) {
      await this.validateLocationBranch(officeLocationId, branchId);
    }

    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (dto.phone) {
      data.phone = normalizePhone(dto.phone);
    }
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.select(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.usersService.remove(id);
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

  private async validateLocationBranch(officeLocationId: string, branchId: string) {
    const location = await this.prisma.officeLocation.findUnique({
      where: { id: officeLocationId },
    });
    if (!location || !location.isActive) {
      throw new NotFoundException('Office location not found or inactive');
    }
    if (location.branchId !== branchId) {
      throw new ConflictException('Office location does not belong to the selected branch');
    }
  }

  private select() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      employeeId: true,
      role: true,
      branchId: true,
      officeLocationId: true,
      joiningDate: true,
      isActive: true,
      createdAt: true,
      branch: { select: { id: true, name: true, code: true } },
      officeLocation: {
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          allowedRadiusMeters: true,
        },
      },
    };
  }
}
