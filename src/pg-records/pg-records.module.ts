import { Module, OnModuleInit } from '@nestjs/common';
import { PgRecordsService } from './pg-records.service';
import { PgRecordsController } from './pg-records.controller';
import { PgReminderService } from './pg-reminder.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [PgRecordsController],
  providers: [PgRecordsService, PgReminderService],
  exports: [PgRecordsService],
})
export class PgRecordsModule implements OnModuleInit {
  constructor(private readonly reminderService: PgReminderService) {}

  onModuleInit() {
    // Run once on startup
    this.reminderService.sendExpiryReminders().catch(() => {});

    // Then run every 24 hours (daily check)
    setInterval(
      () => this.reminderService.sendExpiryReminders().catch(() => {}),
      24 * 60 * 60 * 1000,
    );
  }
}
