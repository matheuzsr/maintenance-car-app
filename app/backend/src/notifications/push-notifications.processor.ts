import { Processor, WorkerHost } from '@nestjs/bullmq';
import { NotificationDispatchStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  PUSH_NOTIFICATIONS_QUEUE,
  SEND_PUSH_NOTIFICATION_JOB,
  SendPushNotificationJobData,
} from './notifications.constants';
import { WebPushGateway } from './web-push.gateway';

interface PushErrorLike {
  message?: unknown;
  statusCode?: unknown;
}

const DELIVERY_LEASE_MS = 120_000;

@Processor(PUSH_NOTIFICATIONS_QUEUE, { concurrency: 10 })
export class PushNotificationsProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushGateway,
  ) {
    super();
  }

  async process(job: Job<SendPushNotificationJobData>): Promise<void> {
    if (job.name !== SEND_PUSH_NOTIFICATION_JOB) {
      throw new Error(`Unsupported push notification job: ${job.name}`);
    }

    const notification = await this.prisma.maintenanceNotification.findUnique({
      where: { id: job.data.notificationId },
      include: {
        user: {
          include: {
            pushSubscriptions: { where: { disabledAt: null } },
          },
        },
      },
    });
    if (!notification) return;

    const subscriptions = notification.user.pushSubscriptions;
    if (subscriptions.length === 0) {
      await this.prisma.maintenanceNotification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
      return;
    }

    const transientErrors: Error[] = [];
    for (const subscription of subscriptions) {
      const delivery = await this.prisma.notificationDelivery.upsert({
        where: {
          notificationId_subscriptionId: {
            notificationId: notification.id,
            subscriptionId: subscription.id,
          },
        },
        create: {
          userId: notification.userId,
          notificationId: notification.id,
          subscriptionId: subscription.id,
        },
        update: {},
      });
      const processingToken = randomUUID();
      const processingStartedAt = new Date();
      const staleBefore = new Date(
        processingStartedAt.getTime() - DELIVERY_LEASE_MS,
      );
      const claim = await this.prisma.notificationDelivery.updateMany({
        where: {
          id: delivery.id,
          OR: [
            { status: { in: ['PENDING', 'FAILED'] } },
            {
              status: 'PROCESSING',
              processingStartedAt: { lt: staleBefore },
            },
          ],
        },
        data: {
          status: 'PROCESSING',
          processingToken,
          processingStartedAt,
          attempts: { increment: 1 },
        },
      });
      if (claim.count === 0) continue;

      try {
        await this.webPush.send(subscription, {
          notificationId: notification.id,
          vehicleId: notification.vehicleId,
          planId: notification.planId,
          trigger: notification.trigger,
          severity: notification.severity,
          title: notification.title,
          body: notification.body,
          reason: notification.reason,
        });
        await this.prisma.notificationDelivery.updateMany({
          where: {
            id: delivery.id,
            status: 'PROCESSING',
            processingToken,
          },
          data: {
            status: 'DELIVERED',
            processingToken: null,
            processingStartedAt: null,
            lastError: null,
            deliveredAt: new Date(),
          },
        });
      } catch (error) {
        const statusCode = this.getStatusCode(error);
        const message = this.getErrorMessage(error);
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.$transaction(async (tx) => {
            const disabled = await tx.notificationDelivery.updateMany({
              where: {
                id: delivery.id,
                status: 'PROCESSING',
                processingToken,
              },
              data: {
                status: 'SUBSCRIPTION_DISABLED',
                processingToken: null,
                processingStartedAt: null,
                lastError: message,
              },
            });
            if (disabled.count > 0) {
              await tx.pushSubscription.updateMany({
                where: {
                  id: subscription.id,
                  userId: notification.userId,
                  disabledAt: null,
                },
                data: { disabledAt: new Date() },
              });
            }
          });
        } else {
          const failed = await this.prisma.notificationDelivery.updateMany({
            where: {
              id: delivery.id,
              status: 'PROCESSING',
              processingToken,
            },
            data: {
              status: 'FAILED',
              processingToken: null,
              processingStartedAt: null,
              lastError: message,
            },
          });
          if (failed.count > 0 && this.isRetryable(statusCode)) {
            transientErrors.push(
              error instanceof Error ? error : new Error(message),
            );
          }
        }
      }
    }

    const deliveryStates = await this.prisma.notificationDelivery.findMany({
      where: { notificationId: notification.id },
      select: { status: true },
    });
    const processing = deliveryStates.filter(
      ({ status }) => status === 'PROCESSING',
    ).length;
    if (processing > 0) {
      if (transientErrors.length > 0) throw transientErrors[0];
      throw new Error('Notification delivery is already being processed');
    }

    const delivered = deliveryStates.filter(
      ({ status }) => status === 'DELIVERED',
    ).length;
    const failed = deliveryStates.filter(
      ({ status }) => status === 'FAILED',
    ).length;
    const permanentlyDisabled = deliveryStates.filter(
      ({ status }) => status === 'SUBSCRIPTION_DISABLED',
    ).length;
    const dispatchStatus = this.resolveDispatchStatus(
      delivered,
      permanentlyDisabled,
      failed,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceNotification.update({
        where: { id: notification.id },
        data: { status: dispatchStatus },
      });
      if (delivered > 0) {
        await tx.maintenanceNotification.updateMany({
          where: { id: notification.id, sentAt: null },
          data: { sentAt: new Date() },
        });
      }
    });

    if (transientErrors.length > 0) throw transientErrors[0];
  }

  private resolveDispatchStatus(
    delivered: number,
    permanentlyDisabled: number,
    transientFailures: number,
  ): NotificationDispatchStatus {
    if (transientFailures > 0) {
      return delivered > 0 ? 'PARTIALLY_FAILED' : 'FAILED';
    }
    if (delivered > 0) return 'DELIVERED';
    return permanentlyDisabled > 0 ? 'FAILED' : 'FAILED';
  }

  private isRetryable(statusCode: number | undefined): boolean {
    return (
      statusCode === undefined ||
      statusCode === 408 ||
      statusCode === 429 ||
      statusCode >= 500
    );
  }

  private getStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const statusCode = (error as PushErrorLike).statusCode;
    return typeof statusCode === 'number' ? statusCode : undefined;
  }

  private getErrorMessage(error: unknown): string {
    const value =
      typeof error === 'object' && error !== null
        ? (error as PushErrorLike).message
        : undefined;
    const message =
      typeof value === 'string'
        ? value
        : error instanceof Error
          ? error.message
          : 'Unknown Web Push error';
    return message.slice(0, 2_000);
  }
}
