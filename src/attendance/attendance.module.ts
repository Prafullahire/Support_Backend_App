import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceCorrectionService } from './attendance-correction.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceCorrectionService],
  exports: [AttendanceService, AttendanceCorrectionService],
})
export class AttendanceModule {}
