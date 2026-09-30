import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { SmsModule } from './sms/sms.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { EntitiesModule } from './entities/entities.module';
import { DepartmentsModule } from './departments/departments.module';
import { VendorsModule } from './vendors/vendors.module';
import { RequestsModule } from './requests/requests.module';
import { CourierModule } from './courier/courier.module';
import { AssetsModule } from './assets/assets.module';
import { JoiningKitModule } from './joining-kit/joining-kit.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IdCardsModule } from './id-cards/id-cards.module';
import { AmcModule } from './amc/amc.module';
import { SeatingModule } from './seating/seating.module';
import { BrochuresModule } from './brochures/brochures.module';
import { PgRecordsModule } from './pg-records/pg-records.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ReportsModule } from './reports/reports.module';
import { ImportsModule } from './imports/imports.module';
import { UploadsModule } from './uploads/uploads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OfficeLocationsModule } from './office-locations/office-locations.module';
import { OfficeBoyStaffModule } from './office-boy-staff/office-boy-staff.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    CloudinaryModule,
    PrismaModule,
    MailModule,
    SmsModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    EntitiesModule,
    DepartmentsModule,
    VendorsModule,
    RequestsModule,
    CourierModule,
    AssetsModule,
    JoiningKitModule,
    ExpensesModule,
    IdCardsModule,
    AmcModule,
    SeatingModule,
    BrochuresModule,
    PgRecordsModule,
    NotificationsModule,
    AuditLogsModule,
    ReportsModule,
    ImportsModule,
    UploadsModule,
    DashboardModule,
    OfficeLocationsModule,
    OfficeBoyStaffModule,
    AttendanceModule,
  ],
})
export class AppModule {}
