import { describe, expect, it, vi } from 'vitest';
import { runRefreshExclusive } from '~/services/api/refresh-lock';

describe('refresh lock', () => {
  it('uses the browser-wide session refresh lock', async () => {
    const request = vi.fn(
      async (_name: string, action: () => Promise<string>) => action(),
    );
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    await expect(runRefreshExclusive(async () => 'access')).resolves.toBe(
      'access',
    );
    expect(request).toHaveBeenCalledWith(
      'garage-em-dia:refresh-session',
      expect.any(Function),
    );
  });

  it('does not overlap refresh actions from separate callers', async () => {
    let queue = Promise.resolve();
    let active = 0;
    let maximumActive = 0;
    const request = <T>(
      _name: string,
      action: () => Promise<T>,
    ): Promise<T> => {
      const result = queue.then(async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        try {
          return await action();
        } finally {
          active -= 1;
        }
      });
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    };
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    await Promise.all([
      runRefreshExclusive(async () => Promise.resolve('first')),
      runRefreshExclusive(async () => Promise.resolve('second')),
    ]);
    expect(maximumActive).toBe(1);
  });
});
