import { MaintenanceCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceAlertGeneratorService } from './maintenance-alert-generator.service';
import { NotificationProducerService } from './notification-producer.service';

describe('MaintenanceAlertGeneratorService', () => {
  const planDelegate = { findMany: jest.fn() };
  const notificationDelegate = {
    create: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = {
    vehicleMaintenancePlan: planDelegate,
    maintenanceNotification: notificationDelegate,
  };
  const producer = { enqueue: jest.fn() };
  const service = new MaintenanceAlertGeneratorService(
    prisma as unknown as PrismaService,
    producer as unknown as NotificationProducerService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates separate date and mileage alerts with stable due-target keys', async () => {
    planDelegate.findMany.mockResolvedValue([
      {
        id: 'plan-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        name: 'Oil change',
        category: MaintenanceCategory.ENGINE,
        intervalMonths: 6,
        intervalKm: 10_000,
        alertBeforeDays: 30,
        alertBeforeKm: 1_000,
        lastPerformedAt: new Date('2026-02-28T03:00:00.000Z'),
        lastPerformedOdometerKm: 20_000,
        user: { timezone: 'America/Sao_Paulo' },
        vehicle: { nickname: 'Daily car', currentOdometerKm: 29_500 },
      },
    ]);
    notificationDelegate.create
      .mockResolvedValueOnce({ id: 'notification-date' })
      .mockResolvedValueOnce({ id: 'notification-odometer' });
    producer.enqueue.mockResolvedValue(undefined);

    await expect(
      service.scan(new Date('2026-08-14T12:00:00.000Z')),
    ).resolves.toEqual({ created: 2, queued: 2 });

    const createInputs = notificationDelegate.create.mock.calls.map(
      (call: [{ data: Record<string, unknown> }]) => call[0].data,
    );
    expect(createInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: 'DATE',
          severity: 'DUE_SOON',
          dedupKey: 'plan-1:DATE:DUE_SOON:2026-08-28',
          reason: '14 day(s) remaining until due',
        }),
        expect.objectContaining({
          trigger: 'ODOMETER',
          severity: 'DUE_SOON',
          dedupKey: 'plan-1:ODOMETER:DUE_SOON:30000',
          reason: '500 km remaining until the limit',
        }),
      ]),
    );
    expect(producer.enqueue).toHaveBeenCalledTimes(2);
  });

  it('uses the PostgreSQL unique key as the idempotency boundary', async () => {
    planDelegate.findMany.mockResolvedValue([
      {
        id: 'plan-1',
        userId: 'user-1',
        vehicleId: 'vehicle-1',
        name: 'Oil change',
        intervalMonths: null,
        intervalKm: 10_000,
        alertBeforeDays: 30,
        alertBeforeKm: 1_000,
        lastPerformedAt: null,
        lastPerformedOdometerKm: 20_000,
        user: { timezone: 'UTC' },
        vehicle: { nickname: 'Daily car', currentOdometerKm: 31_000 },
      },
    ]);
    notificationDelegate.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );
    notificationDelegate.findUnique.mockResolvedValue({
      id: 'existing-notification',
      status: 'DELIVERED',
    });

    await expect(service.scan()).resolves.toEqual({ created: 0, queued: 0 });
    expect(notificationDelegate.findUnique).toHaveBeenCalledWith({
      where: {
        userId_dedupKey: {
          userId: 'user-1',
          dedupKey: 'plan-1:ODOMETER:OVERDUE:30000',
        },
      },
      select: { id: true, status: true },
    });
    expect(producer.enqueue).not.toHaveBeenCalled();
  });
});
