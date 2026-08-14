import { ExpenseCategory } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExpenseFieldsDto } from './expense-fields.dto';
import { ListExpensesQueryDto } from './list-expenses-query.dto';

describe('ExpenseFieldsDto', () => {
  const validInput = {
    category: ExpenseCategory.PARTS,
    description: 'Brake pads',
    incurredAt: '2026-08-13T12:00:00.000-03:00',
    amount: '249.90',
  };

  it.each(['0', '0.01', '249', '249.90', '9999999999.99'])(
    'accepts safe decimal string %s',
    async (amount) => {
      const dto = plainToInstance(ExpenseFieldsDto, {
        ...validInput,
        amount,
      });
      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each([249, '1e3', '-1.00', '0.001', '10000000000.00', '01.00'])(
    'rejects unsafe decimal value %s',
    async (amount) => {
      const dto = plainToInstance(ExpenseFieldsDto, {
        ...validInput,
        amount,
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === 'amount')).toBe(true);
    },
  );

  it('requires an explicit UTC offset and trims text fields', async () => {
    const dto = plainToInstance(ExpenseFieldsDto, {
      ...validInput,
      description: '  Brake pads  ',
      notes: '  Front axle  ',
      incurredAt: '2026-08-13T12:00:00.000',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'incurredAt')).toBe(true);
    expect(dto.description).toBe('Brake pads');
    expect(dto.notes).toBe('Front axle');
  });
});

describe('ListExpensesQueryDto', () => {
  it('validates category and date filters', async () => {
    const dto = plainToInstance(ListExpensesQueryDto, {
      page: '2',
      limit: '10',
      category: ExpenseCategory.LABOR,
      incurredFrom: '2026-08-01T00:00:00.000Z',
      incurredTo: '2026-08-31T23:59:59.999-03:00',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });
});
