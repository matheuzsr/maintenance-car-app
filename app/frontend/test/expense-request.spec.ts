import { describe, expect, it } from 'vitest';
import {
  costReportQuery,
  expenseQuery,
  pageAfterDeletingItem,
} from '~/services/api/expenses';

describe('expense and report request serialization', () => {
  it('serializes pagination and inclusive expense filters', () => {
    expect(
      expenseQuery({
        page: 2,
        limit: 20,
        category: 'PARTS',
        incurredFrom: '2026-08-01T03:00:00.000Z',
        incurredTo: '2026-09-01T02:59:59.000Z',
      }),
    ).toBe(
      'page=2&limit=20&category=PARTS&incurredFrom=2026-08-01T03%3A00%3A00.000Z&incurredTo=2026-09-01T02%3A59%3A59.000Z',
    );
  });

  it('omits absent report bounds', () => {
    expect(costReportQuery({ vehicleId: 'vehicle-1', period: 'monthly' })).toBe(
      'vehicleId=vehicle-1&period=monthly',
    );
  });

  it('returns to the previous page after deleting its last item', () => {
    expect(pageAfterDeletingItem(3, 1)).toBe(2);
    expect(pageAfterDeletingItem(3, 2)).toBe(3);
    expect(pageAfterDeletingItem(1, 1)).toBe(1);
  });
});
