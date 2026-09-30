import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserWelcomeNotificationService } from './user-welcome-notification.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserWelcomeNotificationService],
  exports: [UsersService],
})
export class UsersModule {}
