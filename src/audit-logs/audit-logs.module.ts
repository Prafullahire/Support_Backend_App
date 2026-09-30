import { Module } from '@nestjs/common';
import { AuditService } from '../common/services/base.service';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditService],
  exports: [AuditLogsService, AuditService],
})
export class AuditLogsModule {}