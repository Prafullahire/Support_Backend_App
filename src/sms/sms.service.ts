import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizePhone } from '../common/utils/office-boy.util';

/** Twilio trial accounts only accept these values in the `Body` field (not custom text). */
const TWILIO_TRIAL_SMS_TEMPLATES = new Set([
  'sms_2fa',
  'sms_appointment_reminders',
  'sms_order_confirmation',
  'sms_delivery_updates',
  'sms_customer_support',
  'sms_marketing_promotions',
  'sms_event_notifications',
  'sms_account_alerts',
  'sms_feedback_surveys',
  'sms_internal_alerts',
]);

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly fromNumber: string | undefined;
  private readonly defaultCountryCode: string;
  private readonly trialMode: boolean;
  private readonly trialTemplate: string;

  constructor(private config: ConfigService) {
    this.accountSid = this.readEnv('TWILIO_ACCOUNT_SID');
    this.authToken = this.readEnv('TWILIO_AUTH_TOKEN');
    this.defaultCountryCode =
      this.readEnv('SMS_DEFAULT_COUNTRY_CODE') || '91';
    this.fromNumber = this.formatTwilioFromNumber(this.readEnv('TWILIO_PHONE_NUMBER'));
    this.trialMode = this.readEnv('TWILIO_TRIAL_MODE') === 'true';
    this.trialTemplate = this.resolveTrialTemplate(this.readEnv('TWILIO_TRIAL_SMS_TEMPLATE'));

    if (this.accountSid && this.authToken && this.fromNumber) {
      this.logger.log(`Twilio SMS transport configured (from: ${this.fromNumber})`);
      if (this.trialMode) {
        this.logger.warn(
          `Twilio trial mode enabled — SMS uses template "${this.trialTemplate}" (custom text is not sent until account is upgraded).`,
        );
      }
    } else {
      const missing = [
        !this.accountSid && 'TWILIO_ACCOUNT_SID',
        !this.authToken && 'TWILIO_AUTH_TOKEN',
        !this.fromNumber && 'TWILIO_PHONE_NUMBER',
      ].filter(Boolean);
      this.logger.warn(
        `SMS not configured — missing: ${missing.join(', ') || 'unknown'}. Messages will be logged to console.`,
      );
    }
  }

  private readEnv(key: string): string | undefined {
    const raw = this.config.get<string>(key) ?? process.env[key];
    const value = raw?.trim().replace(/^["']|["']$/g, '');
    return value || undefined;
  }

  private formatTwilioFromNumber(value?: string): string | undefined {
    if (!value) return undefined;
    const digits = normalizePhone(value);
    if (!digits) return undefined;
    if (value.startsWith('+')) return value;
    if (digits.length === 10) {
      return `+${this.defaultCountryCode}${digits}`;
    }
    return `+${digits}`;
  }

  private resolveTrialTemplate(value?: string): string {
    const template = value?.trim() || 'sms_account_alerts';
    if (!TWILIO_TRIAL_SMS_TEMPLATES.has(template)) {
      this.logger.warn(
        `Invalid TWILIO_TRIAL_SMS_TEMPLATE "${template}" — falling back to sms_account_alerts`,
      );
      return 'sms_account_alerts';
    }
    return template;
  }

  private isTrialTemplateError(errorText: string): boolean {
    return (
      errorText.includes('572006') ||
      errorText.toLowerCase().includes('predefined sms templates')
    );
  }

  private parseTwilioErrorCode(errorText: string): number | undefined {
    try {
      const parsed = JSON.parse(errorText) as { code?: number };
      return typeof parsed.code === 'number' ? parsed.code : undefined;
    } catch {
      return undefined;
    }
  }

  private logTwilioFailure(status: number, errorText: string): void {
    const code = this.parseTwilioErrorCode(errorText);

    if (code === 572003) {
      this.logger.error(
        `Twilio SMS failed (${status}, code ${code}): TWILIO_PHONE_NUMBER is wrong for a trial account. ` +
          'Use the Twilio trial sender from Console → Messaging → Try out SMS (not your personal mobile). ' +
          `Currently configured from: ${this.fromNumber}`,
      );
      return;
    }

    if (code === 21608 || code === 21211) {
      this.logger.error(
        `Twilio SMS failed (${status}, code ${code}): Recipient is not verified. ` +
          'Trial accounts can only SMS verified numbers — add the number in Console → Phone Numbers → Verified Caller IDs.',
      );
      return;
    }

    this.logger.error(`Twilio SMS failed (${status}): ${errorText}`);
  }

  private async postTwilioMessage(recipient: string, body: string): Promise<Response> {
    const payload = new URLSearchParams({
      To: recipient,
      From: this.fromNumber!,
      Body: body,
    });

    return fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      },
    );
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    const recipient = this.formatE164(to);
    if (!recipient || !message.trim()) return false;

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      this.logger.log(`[DEV SMS] To: ${recipient}\n${message}`);
      return true;
    }

    const initialBody = this.trialMode ? this.trialTemplate : message;

    try {
      let response = await this.postTwilioMessage(recipient, initialBody);

      if (!response.ok) {
        const errorText = await response.text();

        if (
          !this.trialMode &&
          initialBody !== this.trialTemplate &&
          this.isTrialTemplateError(errorText)
        ) {
          this.logger.warn(
            `Twilio trial account detected — retrying with template "${this.trialTemplate}". ` +
              'Upgrade your Twilio account to send custom welcome SMS text.',
          );
          response = await this.postTwilioMessage(recipient, this.trialTemplate);
        } else {
          this.logTwilioFailure(response.status, errorText);
          return false;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logTwilioFailure(response.status, errorText);
        return false;
      }

      this.logger.log(`SMS sent successfully to ${recipient}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${recipient}`, error);
      return false;
    }
  }

  private formatE164(phone: string): string {
    const digits = normalizePhone(phone);
    if (!digits) return '';

    if (digits.length === 10) {
      return `+${this.defaultCountryCode}${digits}`;
    }

    if (digits.length === 12 && digits.startsWith(this.defaultCountryCode)) {
      return `+${digits}`;
    }

    return digits.startsWith('+') ? digits : `+${digits}`;
  }
}
