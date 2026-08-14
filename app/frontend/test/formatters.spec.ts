import { describe, expect, it } from 'vitest';
import {
  decimalRatioPercent,
  decimalToMinorUnits,
  formatDecimalCurrency,
} from '~/utils/formatters';

describe('decimal formatters', () => {
  it('formats large currency values without converting them to a number', () => {
    expect(formatDecimalCurrency('9999999999.99', 'pt-BR')).toBe(
      'R$ 9.999.999.999,99',
    );
  });

  it('pads decimal currency fractions and respects the active locale', () => {
    expect(formatDecimalCurrency('350.5', 'en-US')).toBe('R$350.50');
    expect(formatDecimalCurrency('invalid', 'pt-BR')).toBe('invalid');
  });

  it('compares decimal values as integer minor units', () => {
    expect(decimalToMinorUnits('9999999999.99')).toBe(999999999999n);
    expect(decimalRatioPercent('0.10', '0.30')).toBe(33.33);
    expect(decimalToMinorUnits('1.234')).toBeUndefined();
  });
});
