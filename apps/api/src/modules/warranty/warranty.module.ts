import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { WarrantyClaimsService } from './warranty-claims.service';
import { WarrantyClaimsController } from './warranty-claims.controller';

@Module({
  imports: [MessagingModule],
  controllers: [WarrantyClaimsController],
  providers: [WarrantyClaimsService],
  exports: [WarrantyClaimsService],
})
export class WarrantyModule {}
