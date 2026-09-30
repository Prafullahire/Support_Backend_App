import { Module } from '@nestjs/common';
import { SeatingService } from './seating.service';
import { SeatingController } from './seating.controller';

@Module({
  controllers: [SeatingController],
  providers: [SeatingService],
  exports: [SeatingService],
})
export class SeatingModule {}
