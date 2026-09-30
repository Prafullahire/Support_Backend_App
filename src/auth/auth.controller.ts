import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterBody, LoginBody } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: false,
    forbidNonWhitelisted: false,
    transform: false,
  }),
)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterBody) {
    const emailOrPhone = (body.emailOrPhone || body.email || body.phone || '').trim();
    if (!emailOrPhone) {
      throw new BadRequestException('Email or phone number is required');
    }
    if (!body.password || body.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }

    return this.authService.register({
      emailOrPhone,
      password: body.password,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      branchId: body.branchId,
      officeLocationId: body.officeLocationId,
      joiningDate: body.joiningDate,
      leavingDate: body.leavingDate,
      address: body.address,
    });
  }

  @Get('register/branches')
  getRegisterBranches() {
    return this.authService.getRegisterBranches();
  }

  @Get('register/office-locations')
  getRegisterOfficeLocations(@Query('branchId') branchId?: string) {
    return this.authService.getRegisterOfficeLocations(branchId);
  }

  @Post('login')
  login(@Body() body: LoginBody) {
    const emailOrPhone = (body.emailOrPhone || body.email || body.phone || '').trim();
    if (!emailOrPhone) {
      throw new BadRequestException('Email or phone number is required');
    }
    if (!body.password) {
      throw new BadRequestException('Password is required');
    }

    return this.authService.login({
      emailOrPhone,
      password: body.password,
    });
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken?: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() body: { refreshToken?: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.logout(body.refreshToken);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email?: string }) {
    const email = (body.email || '').trim();
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token?: string; password?: string }) {
    const token = (body.token || '').trim();
    const password = body.password || '';
    if (!token) {
      throw new BadRequestException('Reset token is required');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    return this.authService.resetPassword(token, password);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}
