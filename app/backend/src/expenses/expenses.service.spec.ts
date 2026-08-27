import { NotFoundException } from '@nestjs/common';
import {
  Expense,
  ExpenseCategory,
  MaintenanceRecord,
  Prisma,
  Vehicle,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  const userId = 'user-1';
  const vehicleId = 'vehicle-1';
  const expenseId = 'expense-1';
  const maintenanceRecordId = 'record-1';
  const now = new Date('2026-08-13T12:00:00.000Z');
  const vehicle: Vehicle = {
    id: vehicleId,
    userId,
    nickname: 'My car',
    brand: 'Honda',
    model: 'Civic',
    year: 2022,
    licensePlate: null,
    currentOdometerKm: 46000,
    currentOdometerRecordedAt: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const maintenanceRecord: MaintenanceRecord = {
    id: maintenanceRecordId,
    userId,
    vehicleId,
    planId: null,
    odometerReadingId: null,
    description: 'Brake service',
    performedAt: now,
    odometerKm: 46000,
    workshop: null,
    notes: null,
    totalCost: new Prisma.Decimal('0'),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const expense: Expense = {
    id: expenseId,
    userId,
    vehicleId,
    maintenanceRecordId,
    category: ExpenseCategory.PARTS,
    description: 'Brake pads',
    incurredAt: now,
    amount: new Prisma.Decimal('249.90'),
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const vehicleDelegate = { findFirst: jest.fn() };
  const recordDelegate = { findFirst: jest.fn() };
  const expenseDelegate = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const transactionClient = {
    vehicle: vehicleDelegate,
    maintenanceRecord: recordDelegate,
    expense: expenseDelegate,
  };
  const prisma = {
    ...transactionClient,
    $transaction: jest.fn(
      (
        input:
          Promise<unknown>[] | ((transaction: unknown) => Promise<unknown>),
      ): Promise<unknown> =>
        typeof input === 'function'
          ? input(transactionClient)
          : Promise.all(input),
    ),
  };
  const service = new ExpensesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    vehicleDelegate.findFirst.mockResolvedValue(vehicle);
    recordDelegate.findFirst.mockResolvedValue(maintenanceRecord);
    expenseDelegate.findFirst.mockResolvedValue(expense);
    expenseDelegate.create.mockResolvedValue(expense);
    expenseDelegate.update.mockResolvedValue(expense);
    expenseDelegate.findMany.mockResolvedValue([expense]);
    expenseDelegate.count.mockResolvedValue(1);
  });

  it('creates an expense after validating the linked record scope', async () => {
    await expect(
      service.create(userId, vehicleId, {
        maintenanceRecordId,
        category: ExpenseCategory.PARTS,
        description: 'Brake pads',
        incurredAt: '2026-08-13T12:00:00.000Z',
        amount: '249.90',
      }),
    ).resolves.toEqual(expense);

    expect(recordDelegate.findFirst).toHaveBeenCalledWith({
      where: {
        id: maintenanceRecordId,
        userId,
        vehicleId,
        deletedAt: null,
      },
    });
    const createCalls = expenseDelegate.create.mock.calls as unknown as Array<
      [
        {
          data: {
            amount: Prisma.Decimal;
            items: { createMany: { data: Array<{ amount: Prisma.Decimal }> } };
          };
        },
      ]
    >;
    const createCall = createCalls[0][0];
    expect(createCall.data.amount.toString()).toBe('249.9');
    expect(createCall.data.items.createMany.data).toHaveLength(1);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('creates expense items and calculates the total from them', async () => {
    await service.create(userId, vehicleId, {
      category: ExpenseCategory.PARTS,
      description: 'Brake service',
      incurredAt: '2026-08-13T12:00:00.000Z',
      amount: '0.00',
      items: [
        {
          category: ExpenseCategory.PARTS,
          description: 'Brake pads',
          amount: '249.90',
        },
        {
          category: ExpenseCategory.LABOR,
          description: 'Labor',
          amount: '80.00',
        },
      ],
    });

    const createCalls = expenseDelegate.create.mock.calls as unknown as Array<
      [
        {
          data: {
            amount: Prisma.Decimal;
            items: {
              createMany: {
                data: Array<{
                  category: ExpenseCategory;
                  description: string;
                  amount: Prisma.Decimal;
                }>;
              };
            };
          };
        },
      ]
    >;
    const createCall = createCalls[0][0];
    expect(createCall.data.amount.toString()).toBe('329.9');
    expect(
      createCall.data.items.createMany.data.map((item) => ({
        category: item.category,
        description: item.description,
        amount: item.amount.toString(),
      })),
    ).toEqual([
      {
        category: ExpenseCategory.PARTS,
        description: 'Brake pads',
        amount: '249.9',
      },
      {
        category: ExpenseCategory.LABOR,
        description: 'Labor',
        amount: '80',
      },
    ]);
  });

  it('rejects a linked record outside the owner and vehicle scope', async () => {
    recordDelegate.findFirst.mockResolvedValue(null);

    await expect(
      service.create(userId, vehicleId, {
        maintenanceRecordId,
        category: ExpenseCategory.LABOR,
        description: 'Labor',
        incurredAt: '2026-08-13T12:00:00.000Z',
        amount: '100.00',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(expenseDelegate.create).not.toHaveBeenCalled();
  });

  it('retries a serializable write conflict with validation inside the transaction', async () => {
    prisma.$transaction
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Write conflict', {
          code: 'P2034',
          clientVersion: '6.19.3',
        }),
      )
      .mockImplementationOnce((input: unknown) =>
        typeof input === 'function'
          ? (input as (transaction: unknown) => Promise<unknown>)(
              transactionClient,
            )
          : Promise.all(input as Promise<unknown>[]),
      );

    await service.create(userId, vehicleId, {
      maintenanceRecordId,
      category: ExpenseCategory.PARTS,
      description: 'Brake pads',
      incurredAt: '2026-08-13T12:00:00.000Z',
      amount: '249.90',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(recordDelegate.findFirst).toHaveBeenCalledTimes(1);
    expect(expenseDelegate.create).toHaveBeenCalledTimes(1);
  });

  it('lists only active expenses using pagination and inclusive filters', async () => {
    await expect(
      service.findAll(userId, vehicleId, {
        page: 2,
        limit: 10,
        category: ExpenseCategory.PARTS,
        incurredFrom: '2026-08-01T00:00:00.000Z',
        incurredTo: '2026-08-31T23:59:59.999Z',
      }),
    ).resolves.toEqual({
      data: [expense],
      meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });

    expect(expenseDelegate.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        vehicleId,
        deletedAt: null,
        category: ExpenseCategory.PARTS,
        incurredAt: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lte: new Date('2026-08-31T23:59:59.999Z'),
        },
      },
      orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
      include: { items: { orderBy: { createdAt: 'asc' } } },
      skip: 10,
      take: 10,
    });
  });

  it('allows an expense to be unlinked from a maintenance record', async () => {
    await service.update(userId, vehicleId, expenseId, {
      maintenanceRecordId: null,
    });

    expect(recordDelegate.findFirst).not.toHaveBeenCalled();
    expect(expenseDelegate.update).toHaveBeenCalledWith({
      where: { id: expenseId, userId, vehicleId, deletedAt: null },
      data: { maintenanceRecordId: null },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('soft-deletes only an active owned expense', async () => {
    await service.remove(userId, vehicleId, expenseId);

    const updateCalls = expenseDelegate.update.mock.calls as unknown as Array<
      [
        {
          where: Record<string, unknown>;
          data: { deletedAt: unknown };
        },
      ]
    >;
    const updateCall = updateCalls[0][0];
    expect(updateCall.where).toEqual({
      id: expenseId,
      userId,
      vehicleId,
      deletedAt: null,
    });
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('does not expose an expense from another ownership scope', async () => {
    expenseDelegate.findFirst.mockResolvedValue(null);

    await expect(service.findOne(userId, vehicleId, expenseId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
