import { Injectable } from '@nestjs/common';
import {
  NotificationSeverity,
  NotificationTrigger,
  Prisma,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateMaintenanceStatus,
  DueStatus,
} from '../reminders/maintenance-status';
import { NotificationProducerService } from './notification-producer.service';

interface AlertCandidate {
  userId: string;
  vehicleId: string;
  planId: string;
  dedupKey: string;
  trigger: NotificationTrigger;
  severity: NotificationSeverity;
  title: string;
  body: string;
  reason: string;
  dueDate: Date | null;
  dueOdometerKm: number | null;
}

@Injectable()
export class MaintenanceAlertGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: NotificationProducerService,
  ) {}

  async scan(now = new Date()): Promise<{ created: number; queued: number }> {
    const plans = await this.prisma.vehicleMaintenancePlan.findMany({
      where: {
        active: true,
        deletedAt: null,
        user: { deletedAt: null },
        vehicle: { deletedAt: null },
      },
      include: {
        user: { select: { timezone: true } },
        vehicle: {
          select: { nickname: true, currentOdometerKm: true },
        },
      },
    });

    let created = 0;
    let queued = 0;
    for (const plan of plans) {
      const status = calculateMaintenanceStatus({
        intervalMonths: plan.intervalMonths,
        intervalKm: plan.intervalKm,
        alertBeforeDays: plan.alertBeforeDays,
        alertBeforeKm: plan.alertBeforeKm,
        lastPerformedAt: plan.lastPerformedAt,
        lastPerformedOdometerKm: plan.lastPerformedOdometerKm,
        currentOdometerKm: plan.vehicle.currentOdometerKm,
        now,
        timezone: plan.user.timezone,
      });
      const candidates = this.buildCandidates(plan, status);

      for (const candidate of candidates) {
        const result = await this.persistCandidate(candidate);
        if (result.wasCreated) created += 1;
        if (result.shouldQueue) {
          await this.producer.enqueue(result.id);
          queued += 1;
        }
      }
    }

    return { created, queued };
  }

  private buildCandidates(
    plan: {
      id: string;
      userId: string;
      vehicleId: string;
      name: string;
      vehicle: { nickname: string; currentOdometerKm: number };
    },
    status: ReturnType<typeof calculateMaintenanceStatus>,
  ): AlertCandidate[] {
    const candidates: AlertCandidate[] = [];
    const title = `Maintenance alert: ${plan.name}`;

    if (
      (status.timeStatus.status === DueStatus.DUE_SOON ||
        status.timeStatus.status === DueStatus.OVERDUE) &&
      status.timeStatus.dueDate
    ) {
      const severity = this.toSeverity(status.timeStatus.status);
      const reason =
        severity === NotificationSeverity.OVERDUE
          ? `Overdue by ${status.timeStatus.overdueByDays ?? 0} day(s)`
          : status.timeStatus.remainingDays === 0
            ? 'Due today based on the time interval'
            : `${status.timeStatus.remainingDays ?? 0} day(s) remaining until due`;
      candidates.push({
        userId: plan.userId,
        vehicleId: plan.vehicleId,
        planId: plan.id,
        dedupKey: `${plan.id}:DATE:${severity}:${status.timeStatus.dueDate}`,
        trigger: NotificationTrigger.DATE,
        severity,
        title,
        body: `${plan.name} for ${plan.vehicle.nickname}: ${reason}.`,
        reason,
        dueDate: DateTime.fromISO(status.timeStatus.dueDate, {
          zone: 'utc',
        }).toJSDate(),
        dueOdometerKm: null,
      });
    }

    if (
      (status.odometerStatus.status === DueStatus.DUE_SOON ||
        status.odometerStatus.status === DueStatus.OVERDUE) &&
      status.odometerStatus.dueAtKm !== undefined
    ) {
      const severity = this.toSeverity(status.odometerStatus.status);
      const reason =
        severity === NotificationSeverity.OVERDUE
          ? status.odometerStatus.overdueByKm === 0
            ? 'Reached the mileage limit'
            : `Exceeded the mileage limit by ${status.odometerStatus.overdueByKm ?? 0} km`
          : `${status.odometerStatus.remainingKm ?? 0} km remaining until the limit`;
      candidates.push({
        userId: plan.userId,
        vehicleId: plan.vehicleId,
        planId: plan.id,
        dedupKey: `${plan.id}:ODOMETER:${severity}:${status.odometerStatus.dueAtKm}`,
        trigger: NotificationTrigger.ODOMETER,
        severity,
        title,
        body: `${plan.name} for ${plan.vehicle.nickname}: ${reason}.`,
        reason,
        dueDate: null,
        dueOdometerKm: status.odometerStatus.dueAtKm,
      });
    }

    return candidates;
  }

  private async persistCandidate(candidate: AlertCandidate): Promise<{
    id: string;
    wasCreated: boolean;
    shouldQueue: boolean;
  }> {
    try {
      const notification = await this.prisma.maintenanceNotification.create({
        data: candidate,
        select: { id: true },
      });
      return { id: notification.id, wasCreated: true, shouldQueue: true };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
      const existing = await this.prisma.maintenanceNotification.findUnique({
        where: {
          userId_dedupKey: {
            userId: candidate.userId,
            dedupKey: candidate.dedupKey,
          },
        },
        select: { id: true, status: true },
      });
      if (!existing) throw error;
      return {
        id: existing.id,
        wasCreated: false,
        shouldQueue: existing.status === 'PENDING',
      };
    }
  }

  private toSeverity(status: DueStatus): NotificationSeverity {
    return status === DueStatus.OVERDUE
      ? NotificationSeverity.OVERDUE
      : NotificationSeverity.DUE_SOON;
  }
}
