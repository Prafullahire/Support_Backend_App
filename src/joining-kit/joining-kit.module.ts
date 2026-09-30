import { Module } from '@nestjs/common';
import { JoiningKitService } from './joining-kit.service';
import { JoiningKitController } from './joining-kit.controller';

@Module({
  controllers: [JoiningKitController],
  providers: [JoiningKitService],
  exports: [JoiningKitService],
})
export class JoiningKitModule {}
