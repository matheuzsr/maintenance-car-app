import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthTransport } from '~/services/api/auth-transport';

describe('auth transport', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('$fetch', fetchMock);
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { apiBaseUrl: 'https://api.example.test' },
    }));
  });

  it('uses the HttpOnly cookie to refresh without exposing a token body', async () => {
    fetchMock.mockResolvedValue({ accessToken: 'access' });

    await useAuthTransport().refresh();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/refresh', {
      baseURL: 'https://api.example.test',
      credentials: 'include',
      method: 'POST',
    });
  });

  it('logs out through the cookie-backed session without a request body', async () => {
    fetchMock.mockResolvedValue({ success: true });

    await useAuthTransport().logout();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', {
      baseURL: 'https://api.example.test',
      credentials: 'include',
      method: 'POST',
    });
  });
});
