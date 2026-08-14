import { describe, expect, it } from 'vitest';
import type { MaintenanceAgendaEntry } from '~/types/api';
import {
  dimensionMessageKey,
  sortAgendaByUrgency,
  statusTone,
} from '~/utils/maintenance';

const entry = (
  status: MaintenanceAgendaEntry['status']['overallStatus'],
  name: string,
) =>
  ({
    plan: { name },
    status: { overallStatus: status },
  }) as MaintenanceAgendaEntry;

describe('maintenance status presentation', () => {
  it('orders overdue and upcoming work before on-track plans', () => {
    expect(
      sortAgendaByUrgency([
        entry('ON_TRACK', 'C'),
        entry('DUE_SOON', 'B'),
        entry('OVERDUE', 'A'),
      ]).map(({ plan }) => plan.name),
    ).toEqual(['A', 'B', 'C']);
  });

  it('maps severity and independent reasons', () => {
    expect(statusTone('OVERDUE')).toBe('danger');
    expect(
      dimensionMessageKey({ status: 'OVERDUE', overdueByDays: 3 }, 'time'),
    ).toBe('maintenance.status.dimension.time.overdue');
    expect(
      dimensionMessageKey({ status: 'DUE_SOON', remainingKm: 450 }, 'odometer'),
    ).toBe('maintenance.status.dimension.odometer.soon');
    expect(
      dimensionMessageKey({ status: 'OVERDUE', overdueByKm: 0 }, 'odometer'),
    ).toBe('maintenance.status.dimension.odometer.reached');
  });
});
