import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '~/stores/session';
import { useVehicleSelectionStore } from '~/stores/vehicle-selection';

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  refresh: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => ({ clear: mocks.clear }),
}));

vi.mock('~/services/api/auth-transport', () => ({
  useAuthTransport: () => ({
    login: mocks.login,
    logout: mocks.logout,
    me: mocks.me,
    refresh: mocks.refresh,
    register: mocks.register,
  }),
}));

const user = {
  id: 'user-1',
  name: 'Driver',
  email: 'driver@example.test',
  timezone: 'America/Sao_Paulo',
};

describe('session state isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: undefined,
    });
  });

  it('clears cached authenticated data and vehicle selection on login', async () => {
    useVehicleSelectionStore().select('previous-user-vehicle');
    mocks.login.mockResolvedValue({ accessToken: 'access', user });

    await useSessionStore().establish('login', {
      email: user.email,
      password: 'strong-password-123',
    });

    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(useVehicleSelectionStore().selectedId).toBeUndefined();
    expect(localStorage.getItem('garage-em-dia:selected-vehicle')).toBeNull();
  });

  it('preserves the local session when server logout cannot be confirmed', async () => {
    mocks.login.mockResolvedValue({ accessToken: 'access', user });
    await useSessionStore().establish('login', {
      email: user.email,
      password: 'strong-password-123',
    });
    mocks.clear.mockClear();
    mocks.logout.mockRejectedValue(new Error('offline'));

    await expect(useSessionStore().logout()).rejects.toThrow('offline');
    expect(useSessionStore().authenticated).toBe(true);
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it('clears cached authenticated state after a failed bootstrap refresh', async () => {
    useVehicleSelectionStore().select('stale-vehicle');
    mocks.refresh.mockRejectedValue(new Error('expired'));

    await expect(useSessionStore().refresh()).resolves.toBe(false);
    expect(mocks.clear).toHaveBeenCalledOnce();
    expect(useVehicleSelectionStore().selectedId).toBeUndefined();
  });
});
