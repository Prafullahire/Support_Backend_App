import { Module } from '@nestjs/common';
import { AmcService } from './amc.service';
import { AmcController } from './amc.controller';

@Module({
  controllers: [AmcController],
  providers: [AmcService],
  exports: [AmcService],
})
export class AmcModule {}
