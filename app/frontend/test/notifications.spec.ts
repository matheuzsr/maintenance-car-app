import { describe, expect, it } from 'vitest';
import { notificationQuery } from '~/services/api/notifications';
import {
  arrayBufferToBase64Url,
  beginNotificationPermissionRequest,
  isIosInstallRequired,
  notificationDeepLink,
  ownsBrowserPushEndpoint,
  pushPayloadDeepLink,
  pushSubscriptionInput,
  resolvePushPermissionState,
  shouldOfferPushReset,
  urlBase64ToUint8Array,
} from '~/utils/notifications';

const vehicleId = '53a4338a-b508-4bea-86a0-a8107c30dd97';
const notificationId = '78b20fe4-3e1f-4f98-8769-b5b02f93d11d';

describe('notification navigation and filters', () => {
  it('builds a fixed vehicle agenda deep link from valid IDs', () => {
    expect(notificationDeepLink(vehicleId, notificationId)).toBe(
      `/vehicles/${vehicleId}/agenda?notification=${notificationId}`,
    );
    expect(pushPayloadDeepLink({ vehicleId, notificationId })).toBe(
      `/vehicles/${vehicleId}/agenda?notification=${notificationId}`,
    );
  });

  it('falls back to the inbox for malformed or redirect-like payload values', () => {
    expect(
      pushPayloadDeepLink({
        vehicleId: '//attacker.example',
        notificationId,
      }),
    ).toBe('/notifications');
    expect(
      pushPayloadDeepLink({ vehicleId, notificationId: 'not-a-uuid' }),
    ).toBe('/notifications');
  });

  it('serializes unread inbox pagination explicitly', () => {
    expect(notificationQuery({ page: 2, limit: 20, unreadOnly: true })).toBe(
      'page=2&limit=20&unreadOnly=true',
    );
  });
});

describe('Web Push browser conversion', () => {
  it('round-trips URL-safe Base64 without padding', () => {
    const bytes = Uint8Array.from([251, 255, 239, 10]);
    const encoded = arrayBufferToBase64Url(bytes.buffer);
    expect(encoded).not.toMatch(/[+/=]/);
    expect([...urlBase64ToUint8Array(encoded)]).toEqual([...bytes]);
  });

  it('extracts browser keys without exposing unrelated subscription data', () => {
    const keys = {
      p256dh: Uint8Array.from({ length: 65 }, (_, index) => index).buffer,
      auth: Uint8Array.from({ length: 16 }, (_, index) => index).buffer,
    };
    const input = pushSubscriptionInput(
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/example',
        getKey: (name) => keys[name],
      },
      'Test browser',
    );
    expect(input?.endpoint).toContain('fcm.googleapis.com');
    expect(input?.p256dh).toHaveLength(87);
    expect(input?.auth).toHaveLength(22);
    expect(input?.userAgent).toBe('Test browser');
  });

  it('does not create an incomplete server registration', () => {
    expect(
      pushSubscriptionInput({
        endpoint: 'https://example.test',
        getKey: () => null,
      }),
    ).toBeUndefined();
  });
});

describe('push permission presentation', () => {
  it('distinguishes unsupported, iOS install, prompt, blocked and active states', () => {
    expect(resolvePushPermissionState(false, undefined, false)).toBe(
      'unsupported',
    );
    expect(resolvePushPermissionState(false, undefined, false, true)).toBe(
      'install-required',
    );
    expect(resolvePushPermissionState(true, 'default', false)).toBe('prompt');
    expect(resolvePushPermissionState(true, 'denied', false)).toBe('denied');
    expect(resolvePushPermissionState(true, 'granted', false)).toBe(
      'unsubscribed',
    );
    expect(resolvePushPermissionState(true, 'granted', true)).toBe(
      'subscribed',
    );
    expect(isIosInstallRequired('Mozilla/5.0 (iPhone)', false)).toBe(true);
    expect(isIosInstallRequired('Mozilla/5.0 (iPhone)', true)).toBe(false);
    expect(
      isIosInstallRequired(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        false,
        'MacIntel',
        5,
      ),
    ).toBe(true);
    expect(
      isIosInstallRequired(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        false,
        'MacIntel',
        0,
      ),
    ).toBe(false);
  });

  it('offers a local reset only for an existing subscription conflict', () => {
    const conflict = { response: { status: 409 } };
    expect(shouldOfferPushReset(conflict, true)).toBe(true);
    expect(shouldOfferPushReset(conflict, false)).toBe(false);
    expect(shouldOfferPushReset({ response: { status: 503 } }, true)).toBe(
      false,
    );
  });

  it('does not treat another account local endpoint as an owned subscription', () => {
    expect(
      ownsBrowserPushEndpoint('https://push.example/old-account', [
        {
          endpoint: 'https://push.example/current-account',
          disabledAt: null,
        },
      ]),
    ).toBe(false);
    expect(
      ownsBrowserPushEndpoint('https://push.example/current-account', [
        {
          endpoint: 'https://push.example/current-account',
          disabledAt: null,
        },
      ]),
    ).toBe(true);
  });

  it('starts the permission request synchronously within the user activation', async () => {
    const events: string[] = [];
    let resolvePermission: (permission: NotificationPermission) => void = () =>
      undefined;
    const pendingPermission = new Promise<NotificationPermission>((resolve) => {
      resolvePermission = resolve;
    });

    const result = beginNotificationPermissionRequest('default', () => {
      events.push('permission-requested');
      return pendingPermission;
    });
    events.push('after-call');

    expect(events).toEqual(['permission-requested', 'after-call']);
    resolvePermission('granted');
    await expect(result).resolves.toBe('granted');
  });
});
