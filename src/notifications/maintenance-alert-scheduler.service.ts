import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  MAINTENANCE_ALERTS_QUEUE,
  MAINTENANCE_ALERTS_SCHEDULER,
  SCAN_MAINTENANCE_ALERTS_JOB,
} from './notifications.constants';

@Injectable()
export class MaintenanceAlertSchedulerService implements OnModuleInit {
  constructor(
    @InjectQueue(MAINTENANCE_ALERTS_QUEUE)
    private readonly alertsQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const configuredInterval = Number(
      this.config.get<string>('NOTIFICATION_SCAN_INTERVAL_MS') ?? 900_000,
    );
    const interval =
      Number.isFinite(configuredInterval) && configuredInterval >= 60_000
        ? configuredInterval
        : 900_000;

    await this.alertsQueue.upsertJobScheduler(
      MAINTENANCE_ALERTS_SCHEDULER,
      { every: interval },
      {
        name: SCAN_MAINTENANCE_ALERTS_JOB,
        data: {},
        opts: { removeOnComplete: 100, removeOnFail: 1_000 },
      },
    );
  }
}
