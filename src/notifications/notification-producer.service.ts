import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  PUSH_NOTIFICATIONS_QUEUE,
  SEND_PUSH_NOTIFICATION_JOB,
  SendPushNotificationJobData,
} from './notifications.constants';

@Injectable()
export class NotificationProducerService {
  constructor(
    @InjectQueue(PUSH_NOTIFICATIONS_QUEUE)
    private readonly pushQueue: Queue<SendPushNotificationJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async enqueue(notificationId: string): Promise<void> {
    const queuedAt = new Date();
    const claim = await this.prisma.maintenanceNotification.updateMany({
      where: { id: notificationId, status: 'PENDING' },
      data: { status: 'QUEUED', queuedAt },
    });
    if (claim.count === 0) return;

    try {
      const existingJob = await this.pushQueue.getJob(notificationId);
      if (!existingJob) {
        await this.pushQueue.add(
          SEND_PUSH_NOTIFICATION_JOB,
          { notificationId },
          {
            jobId: notificationId,
            attempts: 5,
            backoff: { type: 'exponential', delay: 30_000 },
            removeOnComplete: { age: 86_400, count: 1_000 },
            removeOnFail: { age: 604_800, count: 5_000 },
          },
        );
        return;
      }

      const state = await existingJob.getState();
      if (state === 'failed' || state === 'completed') {
        await existingJob.retry(state, {
          resetAttemptsMade: true,
          resetAttemptsStarted: true,
        });
      }
    } catch (error) {
      await this.prisma.maintenanceNotification.updateMany({
        where: { id: notificationId, status: 'QUEUED', queuedAt },
        data: { status: 'PENDING', queuedAt: null },
      });
      throw error;
    }
  }
}
