import type {
  CreatePushSubscriptionInput,
  MaintenanceNotification,
  Paginated,
  PushSubscriptionRecord,
} from '~/types/api';
import { apiErrorStatus, pushSubscriptionInput } from '~/utils/notifications';
import { apiRequest } from './request';

export interface NotificationFilters {
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters: NotificationFilters) =>
    ['notifications', 'list', filters] as const,
  unread: () => ['notifications', 'list', 'unread'] as const,
  subscriptions: () => ['notifications', 'push-subscriptions'] as const,
};

export function notificationQuery(filters: NotificationFilters): string {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.unreadOnly) query.set('unreadOnly', 'true');
  return query.toString();
}

export const listNotifications = (filters: NotificationFilters) =>
  apiRequest<Paginated<MaintenanceNotification>>(
    `/api/v1/notifications?${notificationQuery(filters)}`,
  );

export const markNotificationAsRead = (notificationId: string) =>
  apiRequest<MaintenanceNotification>(
    `/api/v1/notifications/${notificationId}/read`,
    { method: 'PATCH' },
  );

export const getVapidPublicKey = () =>
  apiRequest<{ publicKey: string }>('/api/v1/notifications/vapid-public-key');

export const listPushSubscriptions = () =>
  apiRequest<PushSubscriptionRecord[]>('/api/v1/push-subscriptions');

export const registerPushSubscription = (body: CreatePushSubscriptionInput) =>
  apiRequest<PushSubscriptionRecord>('/api/v1/push-subscriptions', {
    method: 'POST',
    body,
  });

export const disablePushSubscription = async (
  subscriptionId: string,
): Promise<void> => {
  await apiRequest<unknown>(`/api/v1/push-subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
};

async function currentBrowserSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration?.pushManager.getSubscription() ?? null;
}

export async function disableCurrentBrowserPushSubscription(): Promise<void> {
  const subscription = await currentBrowserSubscription();
  if (!subscription) return;
  const serverSubscriptions = await listPushSubscriptions();
  const owned = serverSubscriptions.filter(
    (record) => record.endpoint === subscription.endpoint && !record.disabledAt,
  );
  if (owned.length > 0) {
    await Promise.all(
      owned.map((record) => disablePushSubscription(record.id)),
    );
  }
  await subscription.unsubscribe();
}

export async function reconcileCurrentBrowserPushSubscription(): Promise<void> {
  if (!('Notification' in window)) return;
  const subscription = await currentBrowserSubscription();
  if (!subscription) return;

  if (Notification.permission === 'denied') {
    await disableCurrentBrowserPushSubscription();
    return;
  }
  if (Notification.permission !== 'granted') return;

  const input = pushSubscriptionInput(subscription, navigator.userAgent);
  if (!input) return;
  try {
    await registerPushSubscription(input);
  } catch (error) {
    if (apiErrorStatus(error) === 409) await subscription.unsubscribe();
    throw error;
  }
}
