import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { StatusNotificationService } from './status-notification.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, StatusNotificationService],
  exports: [NotificationsService, StatusNotificationService],
})
export class NotificationsModule {}