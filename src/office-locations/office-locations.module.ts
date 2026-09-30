import { Module } from '@nestjs/common';
import { OfficeLocationsService } from './office-locations.service';
import { OfficeLocationsController } from './office-locations.controller';

@Module({
  controllers: [OfficeLocationsController],
  providers: [OfficeLocationsService],
  exports: [OfficeLocationsService],
})
export class OfficeLocationsModule {}
