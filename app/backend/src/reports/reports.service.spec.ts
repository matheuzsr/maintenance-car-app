import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpenseCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CostReportPeriod } from './dto';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const userId = 'user-1';
  const vehicleId = '8dd2fa9f-c813-4012-ac3b-0c68ce0a93c8';
  const vehicleDelegate = { findFirst: jest.fn() };
  const recordDelegate = { findMany: jest.fn() };
  const expenseDelegate = { findMany: jest.fn() };
  const prisma = {
    vehicle: vehicleDelegate,
    maintenanceRecord: recordDelegate,
    expense: expenseDelegate,
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const service = new ReportsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    vehicleDelegate.findFirst.mockResolvedValue({
      user: { timezone: 'America/Sao_Paulo' },
    });
    recordDelegate.findMany.mockResolvedValue([]);
    expenseDelegate.findMany.mockResolvedValue([]);
  });

  it('keeps service costs and all itemized expenses separate without double counting', async () => {
    recordDelegate.findMany.mockResolvedValue([
      {
        performedAt: new Date('2026-02-01T02:30:00.000Z'),
        totalCost: new Prisma.Decimal('100.00'),
        costItems: [
          {
            category: ExpenseCategory.PARTS,
            amount: new Prisma.Decimal('70.00'),
          },
          {
            category: ExpenseCategory.LABOR,
            amount: new Prisma.Decimal('30.00'),
          },
        ],
      },
      {
        performedAt: new Date('2026-02-01T03:30:00.000Z'),
        totalCost: new Prisma.Decimal('25.00'),
        costItems: [
          {
            category: ExpenseCategory.OTHER,
            amount: new Prisma.Decimal('25.00'),
          },
        ],
      },
    ]);
    expenseDelegate.findMany.mockResolvedValue([
      {
        incurredAt: new Date('2026-02-01T02:45:00.000Z'),
        amount: new Prisma.Decimal('20.00'),
        category: ExpenseCategory.PARTS,
        maintenanceRecordId: 'linked-record',
        items: [
          { category: ExpenseCategory.PARTS, amount: new Prisma.Decimal('20') },
        ],
      },
      {
        incurredAt: new Date('2026-02-01T02:50:00.000Z'),
        amount: new Prisma.Decimal('5.00'),
        category: ExpenseCategory.DIAGNOSTICS,
        maintenanceRecordId: null,
        items: [],
      },
      {
        incurredAt: new Date('2026-02-01T03:45:00.000Z'),
        amount: new Prisma.Decimal('10.00'),
        category: ExpenseCategory.LABOR,
        maintenanceRecordId: null,
        items: [],
      },
    ]);

    const report = await service.getCosts(userId, {
      vehicleId,
      period: CostReportPeriod.MONTHLY,
    });

    expect(report.summary).toEqual({
      serviceCost: '125.00',
      linkedItemizedExpenses: '20.00',
      additionalExpenses: '15.00',
      total: '140.00',
      expensesByCategory: [
        { category: ExpenseCategory.DIAGNOSTICS, total: '5.00' },
        { category: ExpenseCategory.LABOR, total: '40.00' },
        { category: ExpenseCategory.OTHER, total: '25.00' },
        { category: ExpenseCategory.PARTS, total: '90.00' },
      ],
    });
    expect(report.buckets).toEqual([
      {
        period: '2026-01',
        serviceCost: '100.00',
        linkedItemizedExpenses: '20.00',
        additionalExpenses: '5.00',
        total: '105.00',
        expensesByCategory: [
          { category: ExpenseCategory.DIAGNOSTICS, total: '5.00' },
          { category: ExpenseCategory.LABOR, total: '30.00' },
          { category: ExpenseCategory.PARTS, total: '90.00' },
        ],
      },
      {
        period: '2026-02',
        serviceCost: '25.00',
        additionalExpenses: '10.00',
        linkedItemizedExpenses: '0.00',
        total: '35.00',
        expensesByCategory: [
          { category: ExpenseCategory.LABOR, total: '10.00' },
          { category: ExpenseCategory.OTHER, total: '25.00' },
        ],
      },
    ]);
  });

  it('groups by calendar year and returns buckets in chronological order', async () => {
    recordDelegate.findMany.mockResolvedValue([
      {
        performedAt: new Date('2027-01-02T12:00:00.000Z'),
        totalCost: new Prisma.Decimal('75.10'),
      },
      {
        performedAt: new Date('2026-12-02T12:00:00.000Z'),
        totalCost: new Prisma.Decimal('24.90'),
      },
    ]);

    const report = await service.getCosts(userId, {
      vehicleId,
      period: CostReportPeriod.YEARLY,
    });

    expect(report.buckets.map((bucket) => bucket.period)).toEqual([
      '2026',
      '2027',
    ]);
    expect(report.summary.total).toBe('100.00');
  });

  it('scopes ownership and both cost queries to the authenticated user and vehicle', async () => {
    const report = await service.getCosts(userId, {
      vehicleId,
      period: CostReportPeriod.MONTHLY,
      from: '2026-01-01T00:00:00-03:00',
      to: '2026-01-31T23:59:59-03:00',
    });
    const from = new Date('2026-01-01T03:00:00.000Z');
    const to = new Date('2026-02-01T02:59:59.000Z');

    expect(vehicleDelegate.findFirst).toHaveBeenCalledWith({
      where: { id: vehicleId, userId, deletedAt: null },
      select: { user: { select: { timezone: true } } },
    });
    expect(recordDelegate.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        vehicleId,
        deletedAt: null,
        performedAt: { gte: from, lte: to },
      },
      select: {
        performedAt: true,
        totalCost: true,
        costItems: { select: { category: true, amount: true } },
      },
    });
    expect(expenseDelegate.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        vehicleId,
        deletedAt: null,
        incurredAt: { gte: from, lte: to },
      },
      select: {
        incurredAt: true,
        amount: true,
        category: true,
        maintenanceRecordId: true,
        items: { select: { category: true, amount: true } },
      },
    });
    expect(report).toMatchObject({
      vehicleId,
      period: CostReportPeriod.MONTHLY,
      timezone: 'America/Sao_Paulo',
      from: from.toISOString(),
      to: to.toISOString(),
      summary: {
        serviceCost: '0.00',
        additionalExpenses: '0.00',
        linkedItemizedExpenses: '0.00',
        total: '0.00',
        expensesByCategory: [],
      },
      buckets: [],
    });
  });

  it('rejects an inverted date range before querying the database', async () => {
    await expect(
      service.getCosts(userId, {
        vehicleId,
        period: CostReportPeriod.MONTHLY,
        from: '2026-02-01T00:00:00Z',
        to: '2026-01-01T00:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(vehicleDelegate.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not reveal a vehicle outside the authenticated ownership scope', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(null);

    await expect(
      service.getCosts(userId, {
        vehicleId,
        period: CostReportPeriod.MONTHLY,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(recordDelegate.findMany).not.toHaveBeenCalled();
    expect(expenseDelegate.findMany).not.toHaveBeenCalled();
  });
});
