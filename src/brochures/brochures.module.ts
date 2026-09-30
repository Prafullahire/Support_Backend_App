import { Module } from '@nestjs/common';
import { BrochuresService } from './brochures.service';
import { BrochuresController } from './brochures.controller';

@Module({
  controllers: [BrochuresController],
  providers: [BrochuresService],
  exports: [BrochuresService],
})
export class BrochuresModule {}
