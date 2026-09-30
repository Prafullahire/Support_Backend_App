import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '../common/enums';
import { AuditService } from '../common/services/base.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

export interface StatusChangePayload {
  module: string;
  recordId: string;
  recordTitle: string;
  oldStatus?: string;
  newStatus: string;
  updatedByUserId: string;
  recipientUserIds: string[];
  notificationType?: NotificationType;
  link?: string;
}

@Injectable()
export class StatusNotificationService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private auditService: AuditService,
    private config: ConfigService,
  ) {}

  async notifyStatusChange(payload: StatusChangePayload): Promise<void> {
    const {
      module,
      recordId,
      recordTitle,
      oldStatus,
      newStatus,
      updatedByUserId,
      recipientUserIds,
      notificationType = NotificationType.REQUEST_UPDATED,
      link,
    } = payload;

    if (oldStatus && oldStatus === newStatus) return;

    const uniqueRecipientIds = [...new Set(recipientUserIds.filter((id) => id && id !== updatedByUserId))];
    if (uniqueRecipientIds.length === 0) return;

    const [updater, recipients] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: updatedByUserId },
        select: { firstName: true, lastName: true, email: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: uniqueRecipientIds }, isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    const updaterName = updater ? `${updater.firstName} ${updater.lastName}` : 'Admin';
    const title = `${module} status updated`;
    const message = oldStatus
      ? `"${recordTitle}" status changed from ${this.formatStatus(oldStatus)} to ${this.formatStatus(newStatus)} by ${updaterName}.`
      : `"${recordTitle}" status set to ${this.formatStatus(newStatus)} by ${updaterName}.`;
    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const recordLink = link || `${frontendUrl}/${module.toLowerCase()}`;

    await Promise.all(
      recipients.map(async (recipient) => {
        await this.notificationsService.create({
          userId: recipient.id,
          title,
          message,
          type: notificationType,
          link: recordLink,
        });

        if (recipient.email) {
          await this.mailService.sendMail({
            to: recipient.email,
            subject: `[Support App] ${title}`,
            html: this.buildEmailHtml({
              recipientName: recipient.firstName,
              module,
              recordTitle,
              oldStatus,
              newStatus,
              updaterName,
              recordLink,
            }),
            text: `Hi ${recipient.firstName},\n\n${message}\n\nView details: ${recordLink}`,
          });
        }
      }),
    );

    await this.auditService.log(
      updatedByUserId,
      'STATUS_CHANGE',
      module,
      recordId,
      JSON.stringify({ oldStatus, newStatus, notifiedUsers: recipients.map((r) => r.id) }),
    );
  }

  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private buildEmailHtml(params: {
    recipientName: string;
    module: string;
    recordTitle: string;
    oldStatus?: string;
    newStatus: string;
    updaterName: string;
    recordLink: string;
  }): string {
    const statusLine = params.oldStatus
      ? `<p><strong>Previous status:</strong> ${this.formatStatus(params.oldStatus)}</p>
         <p><strong>New status:</strong> ${this.formatStatus(params.newStatus)}</p>`
      : `<p><strong>Status:</strong> ${this.formatStatus(params.newStatus)}</p>`;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0A0A0A; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Support Team Management</h2>
        </div>
        <div style="border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p>Hi ${params.recipientName},</p>
          <p>An admin has updated the status of your ${params.module.toLowerCase()} record.</p>
          <p><strong>Title:</strong> ${params.recordTitle}</p>
          ${statusLine}
          <p><strong>Updated by:</strong> ${params.updaterName}</p>
          <a href="${params.recordLink}" style="display: inline-block; margin-top: 16px; background: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Details</a>
        </div>
      </div>
    `;
  }
}
