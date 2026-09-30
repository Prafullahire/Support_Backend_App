import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CourierService } from './courier.service';
import { CourierController } from './courier.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [CourierController],
  providers: [CourierService],
  exports: [CourierService],
})
export class CourierModule {}