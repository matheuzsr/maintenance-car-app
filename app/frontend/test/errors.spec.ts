import { describe, expect, it } from 'vitest';
import { normalizeApiError } from '~/services/api/errors';

describe('normalizeApiError', () => {
  it('keeps the HTTP status and correlation ID for diagnostics', () => {
    const response = new Response(null, {
      status: 503,
      headers: { 'x-correlation-id': 'request-123' },
    });

    expect(normalizeApiError(new Error('API unavailable'), response)).toEqual({
      message: 'API unavailable',
      status: 503,
      correlationId: 'request-123',
    });
  });
});
