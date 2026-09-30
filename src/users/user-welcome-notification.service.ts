import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../common/enums';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { isSystemGeneratedEmail } from '../common/utils/contact.util';

type WelcomeUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
};

@Injectable()
export class UserWelcomeNotificationService {
  private readonly logger = new Logger(UserWelcomeNotificationService.name);

  constructor(
    private config: ConfigService,
    private mailService: MailService,
    private smsService: SmsService,
  ) {}

  async sendWelcomeNotifications(user: WelcomeUser): Promise<{ smsSent: boolean; emailSent: boolean }> {
    const loginUrl = this.getLoginUrl();
    const loginId = user.role === UserRole.OFFICE_BOY && user.phone ? user.phone : user.email;
    const result = { smsSent: false, emailSent: false };

    if (user.phone?.trim()) {
      const smsMessage =
        `Hello ${user.firstName}, your Support App account is ready.\n` +
        `Login: ${loginUrl}\n` +
        `Use ${loginId} and your password to sign in.`;

      result.smsSent = await this.smsService.sendSms(user.phone, smsMessage);
      if (!result.smsSent) {
        this.logger.warn(`Welcome SMS could not be sent for user ${user.email}`);
      }
    }

    if (user.email && !isSystemGeneratedEmail(user.email)) {
      result.emailSent = await this.mailService.sendMail({
        to: user.email,
        subject: 'Your Support App account is ready',
        text:
          `Hello ${user.firstName},\n\n` +
          `Your account has been created on Support App.\n\n` +
          `Login here: ${loginUrl}\n` +
          `Sign in with: ${loginId}\n\n` +
          `Use the password set by your administrator.`,
        html:
          `<p>Hello ${user.firstName},</p>` +
          `<p>Your account has been created on <strong>Support App</strong>.</p>` +
          `<p><a href="${loginUrl}">Click here to login</a></p>` +
          `<p>Sign in with: <strong>${loginId}</strong></p>` +
          `<p>Use the password set by your administrator.</p>`,
      });
    }

    return result;
  }

  private getLoginUrl(): string {
    const frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    return `${frontendUrl}/login`;
  }
}
