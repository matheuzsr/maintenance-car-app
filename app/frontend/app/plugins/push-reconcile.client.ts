import { reconcileCurrentBrowserPushSubscription } from '~/services/api/notifications';
import { apiErrorStatus } from '~/utils/notifications';

export default defineNuxtPlugin(() => {
  const session = useSessionStore();
  watch(
    [() => session.authenticated, () => session.user?.id],
    async ([authenticated]) => {
      if (!authenticated || !navigator.onLine) return;
      try {
        await reconcileCurrentBrowserPushSubscription();
        session.setPushSubscriptionConflict(false);
      } catch (error) {
        if (apiErrorStatus(error) === 409) {
          session.setPushSubscriptionConflict(true);
        }
        // Reconciliation is retried from notification settings and must not
        // block session bootstrap when a push service is unavailable.
      }
    },
    { immediate: true },
  );
});
