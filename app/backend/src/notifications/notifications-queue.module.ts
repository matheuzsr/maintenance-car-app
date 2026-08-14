import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  MAINTENANCE_ALERTS_QUEUE,
  PUSH_NOTIFICATIONS_QUEUE,
} from './notifications.constants';

function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  const database = url.pathname.slice(1);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: database ? Number(database) : undefined,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    BullModule.registerQueue(
      { name: MAINTENANCE_ALERTS_QUEUE },
      { name: PUSH_NOTIFICATIONS_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class NotificationsQueueModule {}
