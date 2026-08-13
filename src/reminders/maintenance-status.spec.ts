import { calculateMaintenanceStatus, DueStatus } from './maintenance-status';

const base = {
  intervalMonths: 6,
  intervalKm: 10000,
  alertBeforeDays: 30,
  alertBeforeKm: 1000,
  lastPerformedAt: new Date('2026-01-15T15:00:00Z'),
  lastPerformedOdometerKm: 50000,
  currentOdometerKm: 55000,
  now: new Date('2026-06-01T12:00:00Z'),
  timezone: 'America/Sao_Paulo',
};

describe('calculateMaintenanceStatus', () => {
  it('evaluates calendar and odometer independently', () => {
    const result = calculateMaintenanceStatus({
      ...base,
      now: new Date('2026-07-20T12:00:00Z'),
      currentOdometerKm: 59500,
    });

    expect(result.overallStatus).toBe(DueStatus.OVERDUE);
    expect(result.timeStatus.status).toBe(DueStatus.OVERDUE);
    expect(result.odometerStatus.status).toBe(DueStatus.DUE_SOON);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Vencida'),
        'Faltam 500 km para o limite',
      ]),
    );
  });

  it('reports unknown references without hiding the configured dimension', () => {
    const result = calculateMaintenanceStatus({
      ...base,
      lastPerformedAt: null,
      intervalKm: null,
    });

    expect(result.timeStatus.status).toBe(DueStatus.UNKNOWN);
    expect(result.odometerStatus.status).toBe(DueStatus.NOT_CONFIGURED);
    expect(result.overallStatus).toBe(DueStatus.UNKNOWN);
  });

  it('uses calendar months in the user timezone', () => {
    const result = calculateMaintenanceStatus({
      ...base,
      intervalMonths: 1,
      intervalKm: null,
      lastPerformedAt: new Date('2026-01-31T15:00:00Z'),
      now: new Date('2026-02-15T12:00:00Z'),
    });

    expect(result.timeStatus.dueDate).toBe('2026-02-28');
    expect(result.timeStatus.status).toBe(DueStatus.DUE_SOON);
  });

  it('marks the exact odometer limit as overdue', () => {
    const result = calculateMaintenanceStatus({
      ...base,
      intervalMonths: null,
      currentOdometerKm: 60000,
    });

    expect(result.odometerStatus).toMatchObject({
      status: DueStatus.OVERDUE,
      dueAtKm: 60000,
      overdueByKm: 0,
    });
  });
});
