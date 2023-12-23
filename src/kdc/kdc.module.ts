import { Module } from '@nestjs/common';
import { KdcService } from './kdc.service';
import { KdcController } from './kdc.controller';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { KdcGateway } from './kdc.gateway';
import Redis from 'ioredis';

@Module({
  imports: [],
  controllers: [KdcController],
  providers: [KdcService, KdcGateway],
})
export class KdcModule {}
