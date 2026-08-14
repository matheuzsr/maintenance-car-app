import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CostReportPeriod, CostReportQueryDto } from './cost-report-query.dto';

describe('CostReportQueryDto', () => {
  const vehicleId = '8dd2fa9f-c813-4012-ac3b-0c68ce0a93c8';

  it('accepts optional ISO instants with explicit UTC offsets', async () => {
    const dto = plainToInstance(CostReportQueryDto, {
      vehicleId,
      period: CostReportPeriod.MONTHLY,
      from: '2026-01-01T00:00:00-03:00',
      to: '2026-02-01T03:00:00Z',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects dates without a UTC offset', async () => {
    const dto = plainToInstance(CostReportQueryDto, {
      vehicleId,
      period: CostReportPeriod.MONTHLY,
      from: '2026-01-01T00:00:00',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'from')).toBe(true);
  });

  it('requires a UUID vehicle and a supported period', async () => {
    const dto = plainToInstance(CostReportQueryDto, {
      vehicleId: 'not-a-uuid',
      period: 'weekly',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'period',
      'vehicleId',
    ]);
  });
});
