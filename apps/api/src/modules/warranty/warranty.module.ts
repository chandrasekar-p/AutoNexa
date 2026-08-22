import { Module } from '@nestjs/common';
import { WarrantyClaimsService } from './warranty-claims.service';
import { WarrantyClaimsController } from './warranty-claims.controller';

@Module({
  controllers: [WarrantyClaimsController],
  providers: [WarrantyClaimsService],
  exports: [WarrantyClaimsService],
})
export class WarrantyModule {}
