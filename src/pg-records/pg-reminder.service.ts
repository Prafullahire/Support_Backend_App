import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class PgReminderService {
  private readonly logger = new Logger(PgReminderService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  /**
   * Called by a scheduled cron job (daily).
   * Finds PG records whose agreement expires within their configured reminderDays,
   * and sends an email notification to the admin.
   */
  async sendExpiryReminders(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await this.prisma.pgRecord.findMany({
      where: { status: 'ACTIVE' },
      include: { branch: { select: { name: true } } },
    });

    let sent = 0;

    for (const record of records) {
      const agreementEnd = new Date(record.agreementEnd);
      const reminderDays = record.reminderDays ?? 5;

      const reminderDate = new Date(agreementEnd);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);
      reminderDate.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil(
        (agreementEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Send email if today is on or after the reminder trigger date AND agreement hasn't ended
      if (today >= reminderDate && daysLeft > 0) {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
        if (!adminEmail) {
          this.logger.warn('No ADMIN_EMAIL configured — skipping PG reminder emails');
          break;
        }

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ PG Agreement Expiry Reminder</h2>
            <p>The following PG accommodation agreement is expiring soon:</p>
            <table style="width:100%; border-collapse:collapse; margin-top:12px;">
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Employee</td><td style="padding:8px;">${record.employeeName}</td></tr>
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Raised By</td><td style="padding:8px;">${record.raisedBy || '-'}</td></tr>
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Location</td><td style="padding:8px;">${record.location || '-'}</td></tr>
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Branch</td><td style="padding:8px;">${record.branch?.name || '-'}</td></tr>
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Address</td><td style="padding:8px;">${record.address}</td></tr>
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Agreement End</td><td style="padding:8px; color:#dc2626; font-weight:bold;">${agreementEnd.toLocaleDateString()}</td></tr>
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Days Remaining</td><td style="padding:8px; color:#dc2626; font-weight:bold;">${daysLeft} day(s)</td></tr>
              <tr><td style="padding:8px; background:#f3f4f6; font-weight:bold;">Rent Amount</td><td style="padding:8px;">₹${record.rentAmount}</td></tr>
            </table>
            <p style="margin-top:16px; color:#6b7280; font-size:13px;">
              Please take necessary action to renew or close the agreement before it expires.
            </p>
          </div>
        `;

        await this.mail.sendMail({
          to: adminEmail,
          subject: `⚠️ PG Agreement Expiring in ${daysLeft} day(s) — ${record.employeeName}`,
          html,
        });

        this.logger.log(
          `Sent PG expiry reminder for ${record.employeeName} (${daysLeft} days left)`,
        );
        sent++;
      }
    }

    this.logger.log(`PG reminder job completed — ${sent} email(s) sent`);
  }
}
