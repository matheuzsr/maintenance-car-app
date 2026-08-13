import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import {
  CostReportBucketDto,
  CostReportPeriod,
  CostReportQueryDto,
  CostReportResponseDto,
  CostTotalsDto,
  ExpenseCategoryTotalDto,
} from './dto';

interface MutableCostTotals {
  serviceCost: Prisma.Decimal;
  additionalExpenses: Prisma.Decimal;
  linkedItemizedExpenses: Prisma.Decimal;
  expensesByCategory: Map<ExpenseCategory, Prisma.Decimal>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCosts(
    userId: string,
    query: CostReportQueryDto,
  ): Promise<CostReportResponseDto> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('from must be earlier than or equal to to');
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: query.vehicleId, userId, deletedAt: null },
      select: { user: { select: { timezone: true } } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const dateFilter: Prisma.DateTimeFilter = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
    const [records, expenses] = await this.prisma.$transaction([
      this.prisma.maintenanceRecord.findMany({
        where: {
          userId,
          vehicleId: query.vehicleId,
          deletedAt: null,
          ...(from || to ? { performedAt: dateFilter } : {}),
        },
        select: { performedAt: true, totalCost: true },
      }),
      this.prisma.expense.findMany({
        where: {
          userId,
          vehicleId: query.vehicleId,
          deletedAt: null,
          ...(from || to ? { incurredAt: dateFilter } : {}),
        },
        select: {
          incurredAt: true,
          amount: true,
          category: true,
          maintenanceRecordId: true,
        },
      }),
    ]);

    const summary = this.emptyTotals();
    const buckets = new Map<string, MutableCostTotals>();
    for (const record of records) {
      summary.serviceCost = summary.serviceCost.plus(record.totalCost);
      const bucket = this.getBucket(
        buckets,
        record.performedAt,
        query.period,
        vehicle.user.timezone,
      );
      bucket.serviceCost = bucket.serviceCost.plus(record.totalCost);
    }

    for (const expense of expenses) {
      this.addExpense(
        summary,
        expense.category,
        expense.amount,
        expense.maintenanceRecordId !== null,
      );
      const bucket = this.getBucket(
        buckets,
        expense.incurredAt,
        query.period,
        vehicle.user.timezone,
      );
      this.addExpense(
        bucket,
        expense.category,
        expense.amount,
        expense.maintenanceRecordId !== null,
      );
    }

    return {
      vehicleId: query.vehicleId,
      period: query.period,
      timezone: vehicle.user.timezone,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      summary: this.serializeTotals(summary),
      buckets: [...buckets.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([period, totals]): CostReportBucketDto => ({
          period,
          ...this.serializeTotals(totals),
        })),
    };
  }

  private getBucket(
    buckets: Map<string, MutableCostTotals>,
    occurredAt: Date,
    period: CostReportPeriod,
    timezone: string,
  ): MutableCostTotals {
    const localDate = DateTime.fromJSDate(occurredAt, { zone: timezone });
    const key = localDate.toFormat(
      period === CostReportPeriod.MONTHLY ? 'yyyy-LL' : 'yyyy',
    );
    const existing = buckets.get(key);
    if (existing) return existing;

    const created = this.emptyTotals();
    buckets.set(key, created);
    return created;
  }

  private addExpense(
    totals: MutableCostTotals,
    category: ExpenseCategory,
    amount: Prisma.Decimal,
    linkedToRecord: boolean,
  ): void {
    if (linkedToRecord) {
      totals.linkedItemizedExpenses =
        totals.linkedItemizedExpenses.plus(amount);
    } else {
      totals.additionalExpenses = totals.additionalExpenses.plus(amount);
    }
    totals.expensesByCategory.set(
      category,
      (totals.expensesByCategory.get(category) ?? new Prisma.Decimal(0)).plus(
        amount,
      ),
    );
  }

  private emptyTotals(): MutableCostTotals {
    return {
      serviceCost: new Prisma.Decimal(0),
      additionalExpenses: new Prisma.Decimal(0),
      linkedItemizedExpenses: new Prisma.Decimal(0),
      expensesByCategory: new Map(),
    };
  }

  private serializeTotals(totals: MutableCostTotals): CostTotalsDto {
    const expensesByCategory = [...totals.expensesByCategory.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, amount]): ExpenseCategoryTotalDto => ({
        category,
        total: this.money(amount),
      }));

    return {
      serviceCost: this.money(totals.serviceCost),
      additionalExpenses: this.money(totals.additionalExpenses),
      linkedItemizedExpenses: this.money(totals.linkedItemizedExpenses),
      total: this.money(totals.serviceCost.plus(totals.additionalExpenses)),
      expensesByCategory,
    };
  }

  private money(value: Prisma.Decimal): string {
    return value.toFixed(2);
  }
}
