import { describe, expect, it } from 'vitest';
import { localDateTimeToIso, toLocalDateTimeInput } from '~/utils/date-time';

describe('datetime-local conversion', () => {
  it('formats local wall-clock fields instead of UTC fields', () => {
    const date = new Date(2026, 7, 14, 9, 5);
    expect(toLocalDateTimeInput(date)).toBe('2026-08-14T09:05');
  });

  it('round-trips a local input to an offset-aware ISO instant', () => {
    const local = '2026-08-14T09:05';
    expect(localDateTimeToIso(local)).toBe(new Date(local).toISOString());
    expect(localDateTimeToIso('invalid')).toBeUndefined();
  });
});
