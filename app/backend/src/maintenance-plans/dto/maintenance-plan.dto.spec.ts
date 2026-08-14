import { MaintenanceCategory } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMaintenancePlanDto } from './create-maintenance-plan.dto';

describe('CreateMaintenancePlanDto', () => {
  it('trims textual fields', async () => {
    const dto = plainToInstance(CreateMaintenancePlanDto, {
      name: '  Oil change  ',
      description: '  Synthetic oil  ',
      category: MaintenanceCategory.ENGINE,
      intervalKm: 10000,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Oil change');
    expect(dto.description).toBe('Synthetic oil');
  });

  it('rejects blank names and non-positive intervals', async () => {
    const dto = plainToInstance(CreateMaintenancePlanDto, {
      name: '   ',
      category: MaintenanceCategory.ENGINE,
      intervalMonths: 0,
    });

    const errors = await validate(dto);
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['name', 'intervalMonths']),
    );
  });
});
