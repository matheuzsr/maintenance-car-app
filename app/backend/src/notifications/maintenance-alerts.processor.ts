import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MaintenanceAlertGeneratorService } from './maintenance-alert-generator.service';
import {
  MAINTENANCE_ALERTS_QUEUE,
  SCAN_MAINTENANCE_ALERTS_JOB,
} from './notifications.constants';

@Processor(MAINTENANCE_ALERTS_QUEUE, { concurrency: 1 })
export class MaintenanceAlertsProcessor extends WorkerHost {
  constructor(private readonly generator: MaintenanceAlertGeneratorService) {
    super();
  }

  async process(job: Job): Promise<{ created: number; queued: number }> {
    if (job.name !== SCAN_MAINTENANCE_ALERTS_JOB) {
      throw new Error(`Unsupported maintenance alerts job: ${job.name}`);
    }
    return this.generator.scan();
  }
}
