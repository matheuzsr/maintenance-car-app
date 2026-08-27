import {
  disablePushSubscription,
  getVapidPublicKey,
  listPushSubscriptions,
  notificationKeys,
  registerPushSubscription,
} from '~/services/api/notifications';
import { queryClient } from '~/services/query-client';
import {
  beginNotificationPermissionRequest,
  pushSubscriptionInput,
  resolvePushPermissionState,
  isIosInstallRequired,
  ownsBrowserPushEndpoint,
  shouldOfferPushReset,
  urlBase64ToUint8Array,
  type PushPermissionState,
} from '~/utils/notifications';

export function usePushNotifications() {
  const session = useSessionStore();
  const { isOnline } = useOnlineStatus();
  const supported = ref(false);
  const installRequired = ref(false);
  const subscribed = ref(false);
  const localResetRequired = ref(false);
  const permission = ref<NotificationPermission>();
  const busy = ref(false);
  const error = ref<unknown>();

  const state = computed<PushPermissionState>(() =>
    resolvePushPermissionState(
      supported.value,
      permission.value,
      subscribed.value,
      installRequired.value,
    ),
  );
  const requiresReset = computed(
    () => localResetRequired.value || session.pushSubscriptionConflict,
  );

  async function registration(): Promise<ServiceWorkerRegistration> {
    return navigator.serviceWorker.ready;
  }

  async function inspect(): Promise<PushSubscription | null> {
    error.value = undefined;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    installRequired.value = isIosInstallRequired(
      navigator.userAgent,
      standalone,
      navigator.platform,
      navigator.maxTouchPoints,
    );
    supported.value =
      !installRequired.value &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    if (!supported.value) return null;
    permission.value = Notification.permission;
    const subscription = await (
      await registration()
    ).pushManager.getSubscription();
    subscribed.value = false;
    if (subscription && permission.value === 'granted' && isOnline.value) {
      try {
        const serverSubscriptions = await listPushSubscriptions();
        subscribed.value = ownsBrowserPushEndpoint(
          subscription.endpoint,
          serverSubscriptions,
        );
        if (subscribed.value) {
          session.setPushSubscriptionConflict(false);
          localResetRequired.value = false;
        }
      } catch (cause) {
        error.value = cause;
      }
    }
    return subscription;
  }

  async function removeServerEndpoint(endpoint: string): Promise<boolean> {
    const records = await listPushSubscriptions();
    const matching = records.filter(
      (record) => record.endpoint === endpoint && !record.disabledAt,
    );
    await Promise.all(
      matching.map((record) => disablePushSubscription(record.id)),
    );
    await queryClient.invalidateQueries({
      queryKey: notificationKeys.subscriptions(),
    });
    return matching.length > 0;
  }

  async function reconcileRevokedPermission(): Promise<void> {
    const current = await inspect();
    if (!current || permission.value !== 'denied' || !isOnline.value) return;
    busy.value = true;
    error.value = undefined;
    try {
      const owned = await removeServerEndpoint(current.endpoint);
      if (owned) await current.unsubscribe();
      subscribed.value = false;
    } catch (cause) {
      error.value = cause;
    } finally {
      busy.value = false;
    }
  }

  async function enable(): Promise<boolean> {
    error.value = undefined;
    if (
      !isOnline.value ||
      !supported.value ||
      Notification.permission === 'denied'
    )
      return false;
    busy.value = true;
    const permissionRequest = beginNotificationPermissionRequest(
      Notification.permission,
      () => Notification.requestPermission(),
    );
    let created = false;
    let subscription: PushSubscription | null = null;
    try {
      permission.value = await permissionRequest;
      if (permission.value !== 'granted') return false;
      const serviceWorker = await registration();
      subscription = await serviceWorker.pushManager.getSubscription();
      if (!subscription) {
        const { publicKey } = await getVapidPublicKey();
        subscription = await serviceWorker.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        created = true;
      }
      const hadExistingSubscription = !created;
      const input = pushSubscriptionInput(subscription, navigator.userAgent);
      if (!input)
        throw new Error('Browser returned an incomplete push subscription');
      try {
        await registerPushSubscription(input);
      } catch (cause) {
        if (shouldOfferPushReset(cause, hadExistingSubscription)) {
          localResetRequired.value = true;
          session.setPushSubscriptionConflict(true);
        }
        throw cause;
      }
      subscribed.value = true;
      localResetRequired.value = false;
      session.setPushSubscriptionConflict(false);
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.subscriptions(),
      });
      return true;
    } catch (cause) {
      if (created && subscription) await subscription.unsubscribe();
      error.value = cause;
      subscribed.value = false;
      return false;
    } finally {
      busy.value = false;
    }
  }

  async function resetForCurrentAccount(): Promise<boolean> {
    error.value = undefined;
    if (!isOnline.value) return false;
    busy.value = true;
    let replacement: PushSubscription | null = null;
    try {
      const serviceWorker = await registration();
      const existing = await serviceWorker.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const { publicKey } = await getVapidPublicKey();
      replacement = await serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const input = pushSubscriptionInput(replacement, navigator.userAgent);
      if (!input)
        throw new Error('Browser returned an incomplete push subscription');
      await registerPushSubscription(input);
      subscribed.value = true;
      localResetRequired.value = false;
      session.setPushSubscriptionConflict(false);
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.subscriptions(),
      });
      return true;
    } catch (cause) {
      if (replacement) await replacement.unsubscribe();
      error.value = cause;
      subscribed.value = false;
      return false;
    } finally {
      busy.value = false;
    }
  }

  async function disable(): Promise<boolean> {
    error.value = undefined;
    if (!isOnline.value) return false;
    busy.value = true;
    try {
      const current = await inspect();
      if (current) {
        const owned = await removeServerEndpoint(current.endpoint);
        if (owned) await current.unsubscribe();
      }
      subscribed.value = false;
      return true;
    } catch (cause) {
      error.value = cause;
      return false;
    } finally {
      busy.value = false;
    }
  }

  async function refreshPermission(): Promise<void> {
    await inspect();
    await reconcileRevokedPermission();
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') void refreshPermission();
  }

  onMounted(async () => {
    await inspect();
    await reconcileRevokedPermission();
    window.addEventListener('focus', refreshPermission);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    window.removeEventListener('focus', refreshPermission);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    busy: readonly(busy),
    disable,
    enable,
    error: readonly(error),
    inspect,
    installRequired: readonly(installRequired),
    isOnline,
    permission: readonly(permission),
    reconcileRevokedPermission,
    requiresReset: readonly(requiresReset),
    resetForCurrentAccount,
    state,
    subscribed: readonly(subscribed),
    supported: readonly(supported),
  };
}
