import { isAllowedPushEndpoint } from './push-endpoint-policy';

describe('isAllowedPushEndpoint', () => {
  const hosts =
    'fcm.googleapis.com,updates.push.services.mozilla.com,*.notify.windows.com';

  it('accepts exact and wildcard push-service hosts over HTTPS', () => {
    expect(
      isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc', hosts),
    ).toBe(true);
    expect(
      isAllowedPushEndpoint('https://wns2.notify.windows.com/push/abc', hosts),
    ).toBe(true);
  });

  it('rejects unapproved, deceptive and non-HTTPS endpoints', () => {
    expect(isAllowedPushEndpoint('https://127.0.0.1/push', hosts)).toBe(false);
    expect(
      isAllowedPushEndpoint(
        'https://fcm.googleapis.com.example.test/push',
        hosts,
      ),
    ).toBe(false);
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/push', hosts)).toBe(
      false,
    );
  });
});
