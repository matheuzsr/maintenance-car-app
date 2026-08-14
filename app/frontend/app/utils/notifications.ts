import type { CreatePushSubscriptionInput } from '~/types/api';

export type PushPermissionState =
  | 'unsupported'
  | 'install-required'
  | 'denied'
  | 'prompt'
  | 'unsubscribed'
  | 'subscribed';

export interface PushPayload {
  notificationId?: unknown;
  vehicleId?: unknown;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isNotificationId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function notificationDeepLink(
  vehicleId: string,
  notificationId: string,
): string {
  return `/vehicles/${encodeURIComponent(vehicleId)}/agenda?notification=${encodeURIComponent(notificationId)}`;
}

export function pushPayloadDeepLink(payload: PushPayload): string {
  if (
    typeof payload.vehicleId !== 'string' ||
    !UUID_PATTERN.test(payload.vehicleId) ||
    !isNotificationId(payload.notificationId)
  ) {
    return '/notifications';
  }
  return notificationDeepLink(payload.vehicleId, payload.notificationId);
}

export function resolvePushPermissionState(
  supported: boolean,
  permission: NotificationPermission | undefined,
  subscribed: boolean,
  installRequired = false,
): PushPermissionState {
  if (installRequired) return 'install-required';
  if (!supported) return 'unsupported';
  if (permission === 'denied') return 'denied';
  if (subscribed) return 'subscribed';
  if (permission === 'granted') return 'unsubscribed';
  return 'prompt';
}

export function isIosInstallRequired(
  userAgent: string,
  standalone: boolean,
  platform = '',
  maxTouchPoints = 0,
): boolean {
  const ios =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === 'MacIntel' && maxTouchPoints > 1);
  return ios && !standalone;
}

export function beginNotificationPermissionRequest(
  permission: NotificationPermission,
  requestPermission: () => Promise<NotificationPermission>,
): Promise<NotificationPermission> {
  return permission === 'default'
    ? requestPermission()
    : Promise.resolve(permission);
}

export function ownsBrowserPushEndpoint(
  endpoint: string,
  subscriptions: Array<{ endpoint: string; disabledAt?: string | null }>,
): boolean {
  return subscriptions.some(
    (subscription) =>
      subscription.endpoint === endpoint && !subscription.disabledAt,
  );
}

export function apiErrorStatus(error: unknown): number | undefined {
  const candidate = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  return candidate.response?.status ?? candidate.statusCode ?? candidate.status;
}

export function shouldOfferPushReset(
  error: unknown,
  hadExistingSubscription: boolean,
): boolean {
  return hadExistingSubscription && apiErrorStatus(error) === 409;
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
  const decoded = atob(base64);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function arrayBufferToBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

export function pushSubscriptionInput(
  subscription: Pick<PushSubscription, 'endpoint' | 'getKey'>,
  userAgent?: string,
): CreatePushSubscriptionInput | undefined {
  const p256dh = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');
  if (!p256dh || !auth) return undefined;
  return {
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64Url(p256dh),
    auth: arrayBufferToBase64Url(auth),
    ...(userAgent ? { userAgent } : {}),
  };
}
