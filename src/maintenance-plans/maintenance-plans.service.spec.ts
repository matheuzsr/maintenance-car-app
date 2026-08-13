import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  MaintenanceCategory,
  MaintenanceTemplate,
  VehicleMaintenancePlan,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListMaintenancePlansQueryDto } from './dto';
import { MaintenancePlansService } from './maintenance-plans.service';

describe('MaintenancePlansService', () => {
  const userId = 'user-1';
  const vehicleId = 'vehicle-1';
  const planId = 'plan-1';
  const now = new Date('2026-08-13T12:00:00.000Z');
  const plan: VehicleMaintenancePlan = {
    id: planId,
    userId,
    vehicleId,
    templateId: null,
    name: 'Oil',
    description: null,
    category: MaintenanceCategory.ENGINE,
    intervalMonths: 12,
    intervalKm: 10000,
    alertBeforeDays: 30,
    alertBeforeKm: 1000,
    lastPerformedAt: null,
    lastPerformedOdometerKm: null,
    active: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  const template: MaintenanceTemplate = {
    id: 'template-1',
    slug: 'engine-oil',
    name: 'Oil change',
    description: 'Oil and filter',
    category: MaintenanceCategory.ENGINE,
    suggestedIntervalMonths: 12,
    suggestedIntervalKm: 10000,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  const vehicleDelegate = { findFirst: jest.fn() };
  const planDelegate = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  };
  const templateDelegate = { findFirst: jest.fn() };
  const prisma = {
    vehicle: vehicleDelegate,
    vehicleMaintenancePlan: planDelegate,
    maintenanceTemplate: templateDelegate,
    $transaction: jest.fn((items: Promise<unknown>[]) => Promise.all(items)),
  };
  const service = new MaintenancePlansService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    vehicleDelegate.findFirst.mockResolvedValue({ id: vehicleId });
  });

  it('copies template defaults and preserves explicit overrides', async () => {
    templateDelegate.findFirst.mockResolvedValue(template);
    planDelegate.create.mockResolvedValue(plan);

    await service.create(userId, vehicleId, {
      templateId: template.id,
      name: 'Synthetic oil',
      intervalMonths: 6,
    });

    expect(templateDelegate.findFirst).toHaveBeenCalledWith({
      where: { id: template.id, active: true },
    });
    const createCalls = planDelegate.create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    const createInput = createCalls[0][0];
    expect(createInput.data).toMatchObject({
      userId,
      vehicleId,
      templateId: template.id,
      name: 'Synthetic oil',
      description: template.description,
      category: template.category,
      intervalMonths: 6,
      intervalKm: template.suggestedIntervalKm,
    });
  });

  it('creates a custom plan when its required domain fields are present', async () => {
    planDelegate.create.mockResolvedValue(plan);

    await service.create(userId, vehicleId, {
      name: 'Alinhamento',
      category: MaintenanceCategory.TIRES,
      intervalKm: 10000,
    });

    const createCalls = planDelegate.create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    const createInput = createCalls[0][0];
    expect(createInput.data).toMatchObject({
      templateId: undefined,
      name: 'Alinhamento',
      category: MaintenanceCategory.TIRES,
      intervalMonths: null,
      intervalKm: 10000,
    });
  });

  it('rejects a plan without any interval after resolving defaults', async () => {
    await expect(
      service.create(userId, vehicleId, {
        name: 'Inspection',
        category: MaintenanceCategory.OTHER,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(planDelegate.create).not.toHaveBeenCalled();
  });

  it('does not allow an inactive or unknown template', async () => {
    templateDelegate.findFirst.mockResolvedValue(null);

    await expect(
      service.create(userId, vehicleId, { templateId: template.id }),
    ).rejects.toThrow(NotFoundException);
  });

  it('checks vehicle ownership before exposing its plans', async () => {
    vehicleDelegate.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('another-user', vehicleId, planId),
    ).rejects.toThrow(NotFoundException);
    expect(planDelegate.findFirst).not.toHaveBeenCalled();
    expect(vehicleDelegate.findFirst).toHaveBeenCalledWith({
      where: { id: vehicleId, userId: 'another-user', deletedAt: null },
      select: { id: true },
    });
  });

  it('lists non-deleted plans with pagination and explicit filters', async () => {
    planDelegate.findMany.mockResolvedValue([plan]);
    planDelegate.count.mockResolvedValue(1);
    const query = Object.assign(new ListMaintenancePlansQueryDto(), {
      page: 2,
      limit: 10,
      category: MaintenanceCategory.ENGINE,
      active: false,
    });

    await expect(service.findAll(userId, vehicleId, query)).resolves.toEqual({
      data: [plan],
      meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });
    expect(planDelegate.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        vehicleId,
        deletedAt: null,
        category: MaintenanceCategory.ENGINE,
        active: false,
      },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
  });

  it('rejects an update that removes the last configured interval', async () => {
    planDelegate.findFirst.mockResolvedValue({
      ...plan,
      intervalKm: null,
    });

    await expect(
      service.update(userId, vehicleId, planId, { intervalMonths: null }),
    ).rejects.toThrow(BadRequestException);
    expect(planDelegate.update).not.toHaveBeenCalled();
  });

  it('updates only a plan in the owned vehicle', async () => {
    planDelegate.findFirst.mockResolvedValue(plan);
    planDelegate.update.mockResolvedValue({ ...plan, name: 'Novo nome' });

    await service.update(userId, vehicleId, planId, { name: 'Novo nome' });

    const updateCalls = planDelegate.update.mock.calls as unknown as Array<
      [
        {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        },
      ]
    >;
    const updateInput = updateCalls[0][0];
    expect(updateInput).toMatchObject({
      where: { id: planId, userId, vehicleId, deletedAt: null },
      data: { name: 'Novo nome' },
    });
  });

  it('soft-deletes only a plan in the owned vehicle', async () => {
    planDelegate.findFirst.mockResolvedValue(plan);
    planDelegate.update.mockResolvedValue({ ...plan, deletedAt: now });

    await service.remove(userId, vehicleId, planId);

    expect(planDelegate.update).toHaveBeenCalledWith({
      where: { id: planId, userId, vehicleId, deletedAt: null },
      data: { deletedAt: expect.any(Date) as Date },
    });
  });
});
