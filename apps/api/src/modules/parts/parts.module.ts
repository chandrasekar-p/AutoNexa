import { Module } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';
import { PartCategoriesService } from './part-categories.service';
import { PartCategoriesController } from './part-categories.controller';

@Module({
  controllers: [PartCategoriesController, PartsController],
  providers: [PartsService, PartCategoriesService],
  exports: [PartsService, PartCategoriesService],
})
export class PartsModule {}
