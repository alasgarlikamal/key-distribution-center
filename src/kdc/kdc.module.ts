import { Module } from '@nestjs/common';
import { KdcService } from './kdc.service';
import { KdcController } from './kdc.controller';
import { KdcGateway } from './kdc.gateway';

@Module({
  imports: [],
  controllers: [KdcController],
  providers: [KdcService, KdcGateway],
})
export class KdcModule {}
