import { describe, expect, it } from 'vitest';
import {
  maintenancePlanQuery,
  maintenanceRecordQuery,
} from '~/services/api/maintenance';

describe('maintenance request serialization', () => {
  it('serializes server pagination and filters without undefined values', () => {
    expect(
      maintenancePlanQuery({
        page: 2,
        limit: 20,
        category: 'BRAKES',
        active: false,
      }),
    ).toBe('page=2&limit=20&category=BRAKES&active=false');
    expect(maintenancePlanQuery({ page: 1, limit: 20 })).toBe(
      'page=1&limit=20',
    );
  });

  it('serializes maintenance history filters', () => {
    expect(
      maintenanceRecordQuery({ page: 3, limit: 20, planId: 'plan-1' }),
    ).toBe('page=3&limit=20&planId=plan-1');
    expect(maintenanceRecordQuery({ page: 1, limit: 20 })).toBe(
      'page=1&limit=20',
    );
  });
});
