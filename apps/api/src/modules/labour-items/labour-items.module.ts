import { Module } from '@nestjs/common';
import { LabourItemsService } from './labour-items.service';
import { LabourItemsController } from './labour-items.controller';

@Module({
  controllers: [LabourItemsController],
  providers: [LabourItemsService],
  exports: [LabourItemsService],
})
export class LabourItemsModule {}
