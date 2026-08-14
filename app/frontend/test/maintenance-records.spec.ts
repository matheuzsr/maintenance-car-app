import { describe, expect, it } from 'vitest';
import {
  maintenanceRecordInvalidationKeys,
  maintenanceRecordDeleteErrorKey,
  maintenanceRecordQuery,
} from '~/utils/maintenance-records';

describe('maintenance record synchronization', () => {
  it('builds stable filters without an empty plan id', () => {
    expect(maintenanceRecordQuery(2, 20, '')).toEqual({ page: 2, limit: 20 });
    expect(maintenanceRecordQuery(1, 20, 'plan-1')).toEqual({
      page: 1,
      limit: 20,
      planId: 'plan-1',
    });
  });

  it('invalidates every vehicle view affected by a maintenance write', () => {
    const keys = maintenanceRecordInvalidationKeys('vehicle-1');
    expect(keys).toContainEqual([
      'maintenance',
      'vehicles',
      'vehicle-1',
      'records',
    ]);
    expect(keys).toContainEqual(['vehicles', 'vehicle-1', 'odometer']);
    expect(keys).toContainEqual(['reports', 'vehicles', 'vehicle-1']);
  });

  it('maps an expense conflict to its actionable message', () => {
    expect(maintenanceRecordDeleteErrorKey({ response: { status: 409 } })).toBe(
      'maintenance.records.detail.deleteConflict',
    );
    expect(maintenanceRecordDeleteErrorKey({ response: { status: 500 } })).toBe(
      'maintenance.records.detail.deleteError',
    );
  });
});
