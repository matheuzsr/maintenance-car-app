import { describe, expect, it } from 'vitest';
import { maintenancePlanQuery } from '~/services/api/maintenance';

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
});
