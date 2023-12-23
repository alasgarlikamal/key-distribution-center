import { RedisModule } from '@liaoliaots/nestjs-redis';
import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KdcModule } from './kdc/kdc.module';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: () => ({
        config: {
          url: 'redis://:redis@localhost:6379',
          onClientCreated: (redis: Redis): void => {
            redis.on('ready', () => {
              console.log('Connected to redis');
            });
            redis.on('error', () => {
              console.log('Could not connect to the client!');
            });
          },
        },
      }),
    }),
    KdcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
