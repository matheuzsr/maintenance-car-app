import { describe, expect, it } from 'vitest';
import {
  localDateTimeToIso,
  toLocalDateTimeInput,
  zonedLocalDateTimeToIso,
} from '~/utils/date-time';

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

  it('turns report bounds into instants in the account timezone', () => {
    expect(
      zonedLocalDateTimeToIso('2026-08-14T00:00:00', 'America/Sao_Paulo'),
    ).toBe('2026-08-14T03:00:00.000Z');
    expect(
      zonedLocalDateTimeToIso('invalid', 'America/Sao_Paulo'),
    ).toBeUndefined();
  });

  it('preserves the inclusive final millisecond across a DST boundary', () => {
    expect(
      zonedLocalDateTimeToIso('2026-03-08T00:00:00', 'America/New_York'),
    ).toBe('2026-03-08T05:00:00.000Z');
    expect(
      zonedLocalDateTimeToIso('2026-03-08T23:59:59.999', 'America/New_York'),
    ).toBe('2026-03-09T03:59:59.999Z');
  });
});
