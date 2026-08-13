import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MaintenanceRecordFieldsDto } from './maintenance-record-fields.dto';

describe('MaintenanceRecordFieldsDto', () => {
  const validInput = {
    description: 'Troca de óleo',
    performedAt: '2026-08-13T12:00:00.000Z',
    odometerKm: 46000,
    totalCost: '350.00',
  };

  it.each(['0', '0.01', '350', '350.00', '9999999999.99'])(
    'accepts safe decimal string %s',
    async (totalCost) => {
      const dto = plainToInstance(MaintenanceRecordFieldsDto, {
        ...validInput,
        totalCost,
      });
      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each([350, '1e3', '-1.00', '0.001', '10000000000.00', '01.00'])(
    'rejects unsafe decimal value %s',
    async (totalCost) => {
      const dto = plainToInstance(MaintenanceRecordFieldsDto, {
        ...validInput,
        totalCost,
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'totalCost')).toBe(true);
    },
  );
});
