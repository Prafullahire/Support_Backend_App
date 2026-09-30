import { Module } from '@nestjs/common';
import { OfficeBoyStaffService } from './office-boy-staff.service';
import { OfficeBoyStaffController } from './office-boy-staff.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [OfficeBoyStaffController],
  providers: [OfficeBoyStaffService],
  exports: [OfficeBoyStaffService],
})
export class OfficeBoyStaffModule {}
