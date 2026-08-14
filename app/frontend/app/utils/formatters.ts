export function formatDecimalCurrency(
  value: string,
  locale: string,
  currency = 'BRL',
): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return value;

  const fraction = (match[2] ?? '').padEnd(2, '0');
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter
    .formatToParts(BigInt(match[1]!))
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('');
}
