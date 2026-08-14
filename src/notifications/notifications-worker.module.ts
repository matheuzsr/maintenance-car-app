import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { workerEnvValidationSchema } from '../config/worker-env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { MaintenanceAlertGeneratorService } from './maintenance-alert-generator.service';
import { MaintenanceAlertSchedulerService } from './maintenance-alert-scheduler.service';
import { MaintenanceAlertsProcessor } from './maintenance-alerts.processor';
import { NotificationProducerService } from './notification-producer.service';
import { NotificationsQueueModule } from './notifications-queue.module';
import { PushNotificationsProcessor } from './push-notifications.processor';
import { WebPushGateway } from './web-push.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: workerEnvValidationSchema,
    }),
    PrismaModule,
    NotificationsQueueModule,
  ],
  providers: [
    NotificationProducerService,
    MaintenanceAlertSchedulerService,
    MaintenanceAlertGeneratorService,
    MaintenanceAlertsProcessor,
    WebPushGateway,
    PushNotificationsProcessor,
  ],
})
export class NotificationsWorkerModule {}
