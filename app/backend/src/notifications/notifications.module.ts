import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Module({
  controllers: [NotificationsController, PushSubscriptionsController],
  providers: [NotificationsService, PushSubscriptionsService],
  exports: [NotificationsService, PushSubscriptionsService],
})
export class NotificationsModule {}
