import { NotFoundException } from '@nestjs/common';
import {
  MaintenanceCategory,
  MaintenanceRecord,
  OdometerReadingSource,
  Prisma,
  Vehicle,
  VehicleMaintenancePlan,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceRecordsService } from './maintenance-records.service';

describe('MaintenanceRecordsService', () => {
  const userId = 'user-1';
  const vehicleId = 'vehicle-1';
  const planId = 'plan-1';
  const recordId = 'record-1';
  const currentReference = new Date('2026-08-10T12:00:00.000Z');
  const vehicle: Vehicle = {
    id: vehicleId,
    userId,
    nickname: 'My car',
    brand: 'Honda',
    model: 'Civic',
    year: 2022,
    licensePlate: null,
    currentOdometerKm: 45000,
    currentOdometerRecordedAt: currentReference,
    createdAt: currentReference,
    updatedAt: currentReference,
    deletedAt: null,
  };
  const plan: VehicleMaintenancePlan = {
    id: planId,
    userId,
    vehicleId,
    templateId: null,
    name: 'Oil change',
    description: null,
    category: MaintenanceCategory.ENGINE,
    intervalMonths: 6,
    intervalKm: 10000,
    alertBeforeDays: 30,
    alertBeforeKm: 1000,
    lastPerformedAt: null,
    lastPerformedOdometerKm: null,
    active: true,
    createdAt: currentReference,
    updatedAt: currentReference,
    deletedAt: null,
  };
  const record: MaintenanceRecord = {
    id: recordId,
    userId,
    vehicleId,
    planId,
    odometerReadingId: 'reading-1',
    description: plan.name,
    performedAt: new Date('2026-08-12T12:00:00.000Z'),
    odometerKm: 46000,
    workshop: null,
    notes: null,
    totalCost: new Prisma.Decimal('350.00'),
    createdAt: currentReference,
    updatedAt: currentReference,
    deletedAt: null,
  };

  const vehicleDelegate = {
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const planDelegate = {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const recordDelegate = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const readingDelegate = {
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const expenseDelegate = { count: jest.fn().mockResolvedValue(0) };
  const transactionClient = {
    vehicle: vehicleDelegate,
    vehicleMaintenancePlan: planDelegate,
    maintenanceRecord: recordDelegate,
    odometerReading: readingDelegate,
    expense: expenseDelegate,
  };
  const prisma = {
    vehicle: vehicleDelegate,
    vehicleMaintenancePlan: planDelegate,
    maintenanceRecord: recordDelegate,
    odometerReading: readingDelegate,
    expense: expenseDelegate,
    $transaction: jest.fn(
      (input: unknown): Promise<unknown> | Promise<unknown>[] =>
        typeof input === 'function'
          ? (input as (client: typeof transactionClient) => Promise<unknown>)(
              transactionClient,
            )
          : Promise.all(input as Promise<unknown>[]),
    ),
  };
  const service = new MaintenanceRecordsService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    vehicleDelegate.findFirst.mockResolvedValue(vehicle);
    planDelegate.findFirst.mockResolvedValue(plan);
    recordDelegate.create.mockResolvedValue({
      ...record,
      odometerReadingId: null,
    });
    recordDelegate.findFirst.mockResolvedValue(record);
    readingDelegate.create.mockResolvedValue({ id: 'reading-1' });
    readingDelegate.delete.mockResolvedValue({ id: 'reading-1' });
    readingDelegate.findMany.mockResolvedValue([
      {
        odometerKm: vehicle.currentOdometerKm,
        recordedAt: vehicle.currentOdometerRecordedAt,
      },
    ]);
    recordDelegate.update.mockResolvedValue(record);
    planDelegate.update.mockResolvedValue(plan);
    vehicleDelegate.update.mockResolvedValue(vehicle);
  });

  it('completes a plan atomically and advances all references', async () => {
    await expect(
      service.completePlan(userId, vehicleId, planId, {
        performedAt: '2026-08-12T12:00:00.000Z',
        odometerKm: 46000,
        totalCost: '350.00',
      }),
    ).resolves.toEqual(record);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(planDelegate.findFirst).toHaveBeenCalledWith({
      where: {
        id: planId,
        userId,
        vehicleId,
        deletedAt: null,
        active: true,
      },
    });
    const recordCreateCalls = recordDelegate.create.mock
      .calls as unknown as Array<
      [
        {
          data: {
            description: string;
            totalCost: Prisma.Decimal;
            costItems: {
              createMany: {
                data: Array<{ description: string; amount: Prisma.Decimal }>;
              };
            };
          };
        },
      ]
    >;
    const createInput = recordCreateCalls[0][0];
    expect(createInput.data.description).toBe(plan.name);
    expect(createInput.data.totalCost.toString()).toBe('350');
    expect(
      createInput.data.costItems.createMany.data.map((item) => ({
        description: item.description,
        amount: item.amount.toString(),
      })),
    ).toEqual([{ description: plan.name, amount: '350' }]);
    const readingCreateCalls = readingDelegate.create.mock
      .calls as unknown as Array<[{ data: Record<string, unknown> }]>;
    expect(readingCreateCalls[0][0].data).toMatchObject({
      userId,
      vehicleId,
      odometerKm: 46000,
      source: OdometerReadingSource.MAINTENANCE_RECORD,
    });
    expect(recordDelegate.update).toHaveBeenCalledWith({
      where: { id: recordId },
      data: { odometerReadingId: 'reading-1' },
      include: { costItems: { orderBy: { createdAt: 'asc' } } },
    });
    expect(recordDelegate.findFirst).toHaveBeenCalledWith({
      where: { userId, vehicleId, planId, deletedAt: null },
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
      select: { performedAt: true, odometerKm: true },
    });
    expect(planDelegate.updateMany).toHaveBeenCalledWith({
      where: { id: planId, userId, vehicleId, deletedAt: null },
      data: {
        lastPerformedAt: record.performedAt,
        lastPerformedOdometerKm: record.odometerKm,
      },
    });
    expect(vehicleDelegate.update).toHaveBeenCalledWith({
      where: { id: vehicleId, userId, deletedAt: null },
      data: {
        currentOdometerKm: 46000,
        currentOdometerRecordedAt: new Date('2026-08-12T12:00:00.000Z'),
      },
    });
  });

  it('creates a standalone record and reading without advancing an older reference', async () => {
    recordDelegate.update.mockResolvedValue({ ...record, planId: null });

    await service.create(userId, vehicleId, {
      description: 'Alinhamento',
      performedAt: '2026-08-09T12:00:00.000Z',
      odometerKm: 46000,
      totalCost: '120.50',
    });

    expect(planDelegate.findFirst).not.toHaveBeenCalled();
    const readingCreateCalls = readingDelegate.create.mock
      .calls as unknown as Array<[{ data: Record<string, unknown> }]>;
    expect(readingCreateCalls[0][0].data).toMatchObject({
      source: OdometerReadingSource.MAINTENANCE_RECORD,
    });
    expect(vehicleDelegate.update).not.toHaveBeenCalled();
  });

  it('does not advance the vehicle reference for a lower odometer', async () => {
    await service.create(userId, vehicleId, {
      description: 'Previous service',
      performedAt: '2026-08-12T12:00:00.000Z',
      odometerKm: 44000,
      totalCost: '0',
    });

    expect(vehicleDelegate.update).not.toHaveBeenCalled();
  });

  it('validates an optional plan using owner and vehicle scope', async () => {
    await service.create(userId, vehicleId, {
      planId,
      description: 'Registro vinculado',
      performedAt: '2026-08-12T12:00:00.000Z',
      odometerKm: 46000,
      totalCost: '10.00',
    });

    expect(planDelegate.findFirst).toHaveBeenCalledWith({
      where: { id: planId, userId, vehicleId, deletedAt: null },
    });
    expect(planDelegate.updateMany).toHaveBeenCalledWith({
      where: { id: planId, userId, vehicleId, deletedAt: null },
      data: {
        lastPerformedAt: record.performedAt,
        lastPerformedOdometerKm: record.odometerKm,
      },
    });
  });

  it('keeps the latest plan reference when completing a backdated record', async () => {
    const latest = {
      performedAt: new Date('2026-08-13T12:00:00.000Z'),
      odometerKm: 47000,
    };
    recordDelegate.findFirst.mockResolvedValue(latest);

    await service.completePlan(userId, vehicleId, planId, {
      performedAt: '2026-08-11T12:00:00.000Z',
      odometerKm: 45500,
      totalCost: '100.00',
    });

    expect(planDelegate.updateMany).toHaveBeenCalledWith({
      where: { id: planId, userId, vehicleId, deletedAt: null },
      data: {
        lastPerformedAt: latest.performedAt,
        lastPerformedOdometerKm: latest.odometerKm,
      },
    });
  });

  it('rejects a plan outside the authenticated ownership scope', async () => {
    planDelegate.findFirst.mockResolvedValue(null);

    await expect(
      service.completePlan(userId, vehicleId, planId, {
        performedAt: '2026-08-12T12:00:00.000Z',
        odometerKm: 46000,
        totalCost: '10.00',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(recordDelegate.create).not.toHaveBeenCalled();
  });

  it('keeps record and reading synchronized on update', async () => {
    recordDelegate.findFirst.mockResolvedValue(record);
    const updated = {
      ...record,
      performedAt: new Date('2026-08-13T12:00:00.000Z'),
      odometerKm: 46500,
    };
    recordDelegate.update.mockResolvedValue(updated);

    await expect(
      service.update(userId, vehicleId, recordId, {
        performedAt: '2026-08-13T12:00:00.000Z',
        odometerKm: 46500,
      }),
    ).resolves.toEqual(updated);
    expect(readingDelegate.update).toHaveBeenCalledWith({
      where: { id: 'reading-1' },
      data: {
        recordedAt: new Date('2026-08-13T12:00:00.000Z'),
        odometerKm: 46500,
      },
    });
  });

  it('recomputes the vehicle reference when the current maintenance reading is edited downward', async () => {
    const currentVehicle = {
      ...vehicle,
      currentOdometerKm: record.odometerKm,
      currentOdometerRecordedAt: record.performedAt,
    };
    const fallback = {
      odometerKm: 45000,
      recordedAt: currentReference,
    };
    vehicleDelegate.findFirst.mockResolvedValue(currentVehicle);
    recordDelegate.findFirst.mockResolvedValue(record);
    recordDelegate.update.mockResolvedValue({
      ...record,
      odometerKm: 44000,
      performedAt: new Date('2026-08-09T12:00:00.000Z'),
    });
    readingDelegate.findMany.mockResolvedValue([
      fallback,
      {
        odometerKm: 44000,
        recordedAt: new Date('2026-08-09T12:00:00.000Z'),
      },
    ]);

    await service.update(userId, vehicleId, recordId, {
      odometerKm: 44000,
      performedAt: '2026-08-09T12:00:00.000Z',
    });

    expect(vehicleDelegate.update).toHaveBeenCalledWith({
      where: { id: vehicleId, userId, deletedAt: null },
      data: {
        currentOdometerKm: fallback.odometerKm,
        currentOdometerRecordedAt: fallback.recordedAt,
      },
    });
  });

  it('preserves a newer odometer reference when an older maintenance reading is edited', async () => {
    const newer = {
      odometerKm: 47000,
      recordedAt: new Date('2026-08-13T12:00:00.000Z'),
    };
    vehicleDelegate.findFirst.mockResolvedValue({
      ...vehicle,
      currentOdometerKm: newer.odometerKm,
      currentOdometerRecordedAt: newer.recordedAt,
    });
    readingDelegate.findMany.mockResolvedValue([
      {
        odometerKm: 44000,
        recordedAt: new Date('2026-08-09T12:00:00.000Z'),
      },
      newer,
    ]);

    await service.update(userId, vehicleId, recordId, { odometerKm: 44000 });

    expect(vehicleDelegate.update).toHaveBeenCalledWith({
      where: { id: vehicleId, userId, deletedAt: null },
      data: {
        currentOdometerKm: newer.odometerKm,
        currentOdometerRecordedAt: newer.recordedAt,
      },
    });
  });

  it('soft-deletes only an active owned record', async () => {
    recordDelegate.findFirst.mockResolvedValue(record);

    await service.remove(userId, vehicleId, recordId);

    const recordUpdateCalls = recordDelegate.update.mock
      .calls as unknown as Array<
      [
        {
          where: Record<string, unknown>;
          data: { deletedAt: unknown };
        },
      ]
    >;
    const updateInput = recordUpdateCalls[0][0];
    expect(updateInput.where).toEqual({
      id: recordId,
      userId,
      vehicleId,
      deletedAt: null,
    });
    expect(updateInput.data.deletedAt).toBeInstanceOf(Date);
    expect(updateInput.data).toMatchObject({ odometerReadingId: null });
    expect(readingDelegate.delete).toHaveBeenCalledWith({
      where: { id: 'reading-1' },
    });
  });

  it('recomputes the vehicle reference after deleting its current maintenance reading', async () => {
    const fallback = {
      odometerKm: 45000,
      recordedAt: currentReference,
    };
    vehicleDelegate.findFirst.mockResolvedValue({
      ...vehicle,
      currentOdometerKm: record.odometerKm,
      currentOdometerRecordedAt: record.performedAt,
    });
    readingDelegate.findMany.mockResolvedValue([fallback]);

    await service.remove(userId, vehicleId, recordId);

    expect(vehicleDelegate.update).toHaveBeenCalledWith({
      where: { id: vehicleId, userId, deletedAt: null },
      data: {
        currentOdometerKm: fallback.odometerKm,
        currentOdometerRecordedAt: fallback.recordedAt,
      },
    });
  });

  it('preserves a newer reading after deleting an older maintenance record', async () => {
    const newer = {
      odometerKm: 47000,
      recordedAt: new Date('2026-08-13T12:00:00.000Z'),
    };
    readingDelegate.findMany.mockResolvedValue([
      {
        odometerKm: 45000,
        recordedAt: currentReference,
      },
      newer,
    ]);

    await service.remove(userId, vehicleId, recordId);

    expect(vehicleDelegate.update).toHaveBeenCalledWith({
      where: { id: vehicleId, userId, deletedAt: null },
      data: {
        currentOdometerKm: newer.odometerKm,
        currentOdometerRecordedAt: newer.recordedAt,
      },
    });
  });
});
