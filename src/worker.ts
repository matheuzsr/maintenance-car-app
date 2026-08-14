import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NotificationsWorkerModule } from './notifications/notifications-worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    NotificationsWorkerModule,
  );
  app.enableShutdownHooks();

  Logger.log('Background worker is running', 'Worker');
}

void bootstrap();
