import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  disableCurrentBrowserPushSubscription,
  reconcileCurrentBrowserPushSubscription,
} from '~/services/api/notifications';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getSubscription: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('~/services/api/request', () => ({ apiRequest: mocks.apiRequest }));

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/old-account',
  getKey: (name: PushEncryptionKeyName) =>
    name === 'p256dh' ? Buffer.alloc(65).buffer : Buffer.alloc(16).buffer,
  unsubscribe: mocks.unsubscribe,
};

describe('push subscription account isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubscription.mockResolvedValue(subscription);
    mocks.unsubscribe.mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: { getSubscription: mocks.getSubscription },
        }),
      },
    });
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal('Notification', { permission: 'granted' });
  });

  it('removes an unowned local endpoint after reconciliation conflict without touching its server row', async () => {
    const conflict = { response: { status: 409 } };
    mocks.apiRequest.mockRejectedValueOnce(conflict);

    await expect(reconcileCurrentBrowserPushSubscription()).rejects.toBe(
      conflict,
    );

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledOnce();
    expect(mocks.apiRequest.mock.calls[0]?.[0]).toBe(
      '/api/v1/push-subscriptions',
    );
    expect(
      mocks.apiRequest.mock.calls.some(
        ([path, options]) =>
          String(path).includes('/push-subscriptions/') &&
          (options as { method?: string } | undefined)?.method === 'DELETE',
      ),
    ).toBe(false);
  });

  it('removes an unowned local endpoint during logout cleanup without deleting another account row', async () => {
    mocks.apiRequest.mockResolvedValueOnce([]);

    await disableCurrentBrowserPushSubscription();

    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledWith('/api/v1/push-subscriptions');
    expect(mocks.apiRequest).toHaveBeenCalledTimes(1);
  });
});
