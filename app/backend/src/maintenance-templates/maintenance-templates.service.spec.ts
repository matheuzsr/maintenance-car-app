import { MaintenanceCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceTemplatesService } from './maintenance-templates.service';

describe('MaintenanceTemplatesService', () => {
  const templateDelegate = { findMany: jest.fn() };
  const prisma = { maintenanceTemplate: templateDelegate };
  const service = new MaintenanceTemplatesService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists only active templates in a stable order', async () => {
    templateDelegate.findMany.mockResolvedValue([]);

    await expect(service.findAll({})).resolves.toEqual([]);
    expect(templateDelegate.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  });

  it('applies the optional category filter', async () => {
    templateDelegate.findMany.mockResolvedValue([]);

    await service.findAll({ category: MaintenanceCategory.BRAKES });

    expect(templateDelegate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, category: MaintenanceCategory.BRAKES },
      }),
    );
  });
});
