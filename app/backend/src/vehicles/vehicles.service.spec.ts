import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OdometerReadingSource, Vehicle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, ListQueryDto } from './dto';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  const userId = 'user-1';
  const vehicleId = 'vehicle-1';
  const referenceDate = new Date('2026-08-10T12:00:00.000Z');
  const vehicle: Vehicle = {
    id: vehicleId,
    userId,
    nickname: 'My car',
    brand: 'Honda',
    model: 'Civic',
    year: 2022,
    licensePlate: null,
    currentOdometerKm: 45000,
    currentOdometerRecordedAt: referenceDate,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    deletedAt: null,
  };

  const vehicleDelegate = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const readingDelegate = {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const transactionClient = {
    vehicle: vehicleDelegate,
    odometerReading: readingDelegate,
  };
  const prisma = {
    vehicle: vehicleDelegate,
    odometerReading: readingDelegate,
    $transaction: jest.fn((input: unknown): Promise<unknown> | unknown[] =>
      typeof input === 'function'
        ? (input as (client: typeof transactionClient) => Promise<unknown>)(
            transactionClient,
          )
        : Promise.all(input as Promise<unknown>[]),
    ),
  };
  const service = new VehiclesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the vehicle and its initial MANUAL reading atomically', async () => {
    vehicleDelegate.create.mockResolvedValue(vehicle);
    readingDelegate.create.mockResolvedValue({ id: 'reading-1' });
    const dto: CreateVehicleDto = {
      nickname: vehicle.nickname,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      currentOdometerKm: vehicle.currentOdometerKm,
      currentOdometerRecordedAt: referenceDate.toISOString(),
    };

    await expect(service.create(userId, dto)).resolves.toEqual(vehicle);
    const vehicleCreateCalls = vehicleDelegate.create.mock
      .calls as unknown as Array<[{ data: Record<string, unknown> }]>;
    const readingCreateCalls = readingDelegate.create.mock
      .calls as unknown as Array<[{ data: Record<string, unknown> }]>;
    const vehicleCreateInput = vehicleCreateCalls[0][0];
    const readingCreateInput = readingCreateCalls[0][0];
    expect(vehicleCreateInput.data).toMatchObject({
      userId,
      currentOdometerKm: 45000,
    });
    expect(readingCreateInput.data).toMatchObject({
      userId,
      vehicleId,
      odometerKm: 45000,
      source: OdometerReadingSource.MANUAL,
    });
  });

  it('returns NotFound for a vehicle that does not belong to the user', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(null);

    await expect(service.findOne('another-user', vehicleId)).rejects.toThrow(
      NotFoundException,
    );
    expect(vehicleDelegate.findFirst).toHaveBeenCalledWith({
      where: { id: vehicleId, userId: 'another-user', deletedAt: null },
    });
  });

  it('rejects a lower reading without explicit confirmation', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(vehicle);

    await expect(
      service.createOdometerReading(userId, vehicleId, {
        odometerKm: 44000,
        recordedAt: '2026-08-11T12:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(readingDelegate.create).not.toHaveBeenCalled();
  });

  it('stores a confirmed lower reading without reducing the reference', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(vehicle);
    const reading = { id: 'reading-1', odometerKm: 44000 };
    readingDelegate.create.mockResolvedValue(reading);

    await expect(
      service.createOdometerReading(userId, vehicleId, {
        odometerKm: 44000,
        recordedAt: '2026-08-11T12:00:00.000Z',
        confirmLowerReading: true,
      }),
    ).resolves.toEqual(reading);
    expect(vehicleDelegate.update).not.toHaveBeenCalled();
  });

  it('advances the reference for a non-lower, chronologically relevant reading', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(vehicle);
    const reading = { id: 'reading-1', odometerKm: 46000 };
    readingDelegate.create.mockResolvedValue(reading);
    vehicleDelegate.update.mockResolvedValue({
      ...vehicle,
      currentOdometerKm: 46000,
    });

    await service.createOdometerReading(userId, vehicleId, {
      odometerKm: 46000,
      recordedAt: '2026-08-12T12:00:00.000Z',
    });

    expect(vehicleDelegate.update).toHaveBeenCalledWith({
      where: { id: vehicleId, userId, deletedAt: null },
      data: {
        currentOdometerKm: 46000,
        currentOdometerRecordedAt: new Date('2026-08-12T12:00:00.000Z'),
      },
    });
  });

  it('does not update the reference from an older reading', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(vehicle);
    readingDelegate.create.mockResolvedValue({
      id: 'reading-1',
      odometerKm: 46000,
    });

    await service.createOdometerReading(userId, vehicleId, {
      odometerKm: 46000,
      recordedAt: '2026-08-09T12:00:00.000Z',
    });

    expect(vehicleDelegate.update).not.toHaveBeenCalled();
  });

  it('soft-deletes only an active vehicle owned by the user', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(vehicle);
    vehicleDelegate.update.mockResolvedValue({
      ...vehicle,
      deletedAt: new Date(),
    });

    await service.remove(userId, vehicleId);

    const updateCalls = vehicleDelegate.update.mock.calls as unknown as Array<
      [
        {
          where: Record<string, unknown>;
          data: { deletedAt: unknown };
        },
      ]
    >;
    const updateInput = updateCalls[0][0];
    expect(updateInput.where).toEqual({
      id: vehicleId,
      userId,
      deletedAt: null,
    });
    expect(updateInput.data.deletedAt).toBeInstanceOf(Date);
  });

  it('returns a paginated list filtered by owner and active status', async () => {
    vehicleDelegate.findMany.mockResolvedValue([vehicle]);
    vehicleDelegate.count.mockResolvedValue(1);
    const query = Object.assign(new ListQueryDto(), { page: 1, limit: 20 });

    await expect(service.findAll(userId, query)).resolves.toEqual({
      data: [vehicle],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(vehicleDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, deletedAt: null } }),
    );
  });
});
