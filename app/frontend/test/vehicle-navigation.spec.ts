import { describe, expect, it } from 'vitest';
import { vehicleSelectionTarget } from '~/utils/vehicle-navigation';

describe('vehicle selector navigation', () => {
  it('replaces the vehicle segment on scoped routes', () => {
    expect(
      vehicleSelectionTarget(
        '/vehicles/first/odometer',
        { vehicle: 'first', filter: 'all' },
        'first',
        'second',
      ),
    ).toEqual({
      path: '/vehicles/second/odometer',
      query: { filter: 'all' },
    });
  });

  it('uses query selection on unscoped routes', () => {
    expect(vehicleSelectionTarget('/', {}, undefined, 'second')).toEqual({
      path: '/',
      query: { vehicle: 'second' },
    });
  });
});
