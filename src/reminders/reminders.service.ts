import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaQueryDto } from './agenda-query.dto';
import { calculateMaintenanceStatus } from './maintenance-status';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgenda(userId: string, vehicleId: string, query: AgendaQueryDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId, deletedAt: null },
      include: { user: { select: { timezone: true } } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const plans = await this.prisma.vehicleMaintenancePlan.findMany({
      where: { userId, vehicleId, active: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    const now = new Date();
    const entries = plans.map((plan) => ({
      plan,
      status: calculateMaintenanceStatus({
        intervalMonths: plan.intervalMonths,
        intervalKm: plan.intervalKm,
        alertBeforeDays: plan.alertBeforeDays,
        alertBeforeKm: plan.alertBeforeKm,
        lastPerformedAt: plan.lastPerformedAt,
        lastPerformedOdometerKm: plan.lastPerformedOdometerKm,
        currentOdometerKm: vehicle.currentOdometerKm,
        now,
        timezone: vehicle.user.timezone,
      }),
    }));

    return query.status
      ? entries.filter((entry) => entry.status.overallStatus === query.status)
      : entries;
  }
}
