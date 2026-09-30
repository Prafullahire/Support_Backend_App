import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UserRole } from '../common/enums';
import { isPrivilegedAdmin } from '../common/constants/roles.constants';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { normalizePhone } from '../common/utils/office-boy.util';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) { }

  async register(dto: RegisterDto) {
    const isEmail = dto.emailOrPhone.includes('@');
    const email = isEmail ? dto.emailOrPhone.toLowerCase() : (dto.email?.toLowerCase() || null);
    const phone = !isEmail ? normalizePhone(dto.emailOrPhone) : (dto.phone ? normalizePhone(dto.phone) : null);

    if (!email) {
      throw new BadRequestException('An email is required for registration.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or phone already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        branchId: dto.branchId?.trim() || null,
        officeLocationId: dto.officeLocationId?.trim() || null,
        joiningDate: dto.joiningDate && dto.joiningDate.trim() ? new Date(dto.joiningDate) : null,
        leavingDate: dto.leavingDate && dto.leavingDate.trim() ? new Date(dto.leavingDate) : null,
        address: dto.address?.trim() || null,
        role: UserRole.ADMIN as any, // Defaulting to ADMIN for now
      },
      select: this.userSelect(),
    });

    return this.generateTokens(newUser);
  }

  async login(dto: LoginDto) {
    const user = await this.findUserByEmailOrPhone(dto.emailOrPhone);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === UserRole.OFFICE_BOY) {
      throw new BadRequestException(
        'Office Boy staff must use the Office Boy login with location verification.',
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: this.userSelect(),
    });

    return this.generateTokens(safeUser!);
  }

  private async findUserByEmailOrPhone(value: string) {
    const trimmed = value.trim();
    const emailLower = trimmed.toLowerCase();
    const normalizedPhone = normalizePhone(trimmed);

    const direct = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: emailLower },
          { email: trimmed },
          { phone: trimmed },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });
    if (direct) return direct;

    if (!normalizedPhone) return null;

    const usersWithPhone = await this.prisma.user.findMany({
      where: { phone: { not: null } },
    });
    return usersWithPhone.find(
      (user) => user.phone && normalizePhone(user.phone) === normalizedPhone,
    ) ?? null;
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
      select: this.userSelect(),
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect(),
    });
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new BadRequestException('Please enter a valid admin email address.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return {
        message:
          'If an admin account exists with this email, you will receive a password reset link shortly.',
      };
    }

    if (!isPrivilegedAdmin(user.role as any)) {
      throw new BadRequestException('Password reset is only available for admin accounts.');
    }

    if (!user.isActive) {
      throw new BadRequestException('This admin account is inactive. Contact support.');
    }

    try {
      await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    } catch (error) {
      this.throwPasswordResetSchemaError(error);
    }

    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    try {
      await this.prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });
    } catch (error) {
      this.throwPasswordResetSchemaError(error);
    }

    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailService.sendMail({
      to: user.email,
      subject: 'Reset your admin password',
      text:
        `Hello ${user.firstName},\n\n` +
        `We received a request to reset your admin password.\n\n` +
        `Open this link to set a new password (valid for 1 hour):\n${resetLink}\n\n` +
        `If you did not request this, you can ignore this email.`,
      html:
        `<p>Hello ${user.firstName},</p>` +
        `<p>We received a request to reset your admin password.</p>` +
        `<p><a href="${resetLink}">Click here to set a new password</a></p>` +
        `<p>This link is valid for 1 hour.</p>` +
        `<p>If you did not request this, you can ignore this email.</p>`,
    });

    return {
      message:
        'If an admin account exists with this email, you will receive a password reset link shortly.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      throw new BadRequestException('Reset token is required.');
    }

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: trimmedToken },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      !isPrivilegedAdmin(resetToken.user.role as any) ||
      !resetToken.user.isActive
    ) {
      throw new BadRequestException('Invalid or expired reset link. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return {
      message: 'Password updated successfully. You can now sign in with your new password.',
    };
  }

  async getRegisterBranches() {
    try {
      console.log('➡️ getRegisterBranches called');

      await this.prisma.$queryRaw`SELECT 1`;

      console.log('✅ Database connection successful');

      const branches = await this.prisma.branch.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      console.log('✅ Branches fetched:', branches.length);

      return branches;
    } catch (error) {
      console.error('❌ DATABASE/BRANCH ERROR:', error);
      throw error;
    }
  }

  async getRegisterOfficeLocations(branchId?: string) {
    return this.prisma.officeLocation.findMany({
      where: {
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, name: true, branchId: true },
      orderBy: { name: 'asc' },
    });
  }

  async issueTokensForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect(),
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateTokens(user);
  }

  private throwPasswordResetSchemaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    ) {
      throw new InternalServerErrorException(
        'Password reset is not ready on the server. Run "npm run db:push" in the backend folder, then restart the API.',
      );
    }
    throw error;
  }

  private async generateTokens(user: Record<string, unknown>) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const secret = this.config.get('JWT_SECRET') || process.env.JWT_SECRET || 'support-app-default-jwt-secret-key-32chars!';
    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '30m',
    });

    const refreshToken = randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id as string,
        expiresAt,
      },
    });

    return { user, accessToken, refreshToken };
  }

  private userSelect() {
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
      branch: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true } },
      officeLocation: { select: { id: true, name: true, allowedRadiusMeters: true } },
    };
  }
}
