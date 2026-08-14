import { useQueryClient } from '@tanstack/vue-query';
import {
  markNotificationAsRead,
  notificationKeys,
} from '~/services/api/notifications';
import { isNotificationId } from '~/utils/notifications';

export default defineNuxtPlugin(() => {
  const session = useSessionStore();
  const route = useRoute();
  const queryClient = useQueryClient();
  const processed = new Set<string>();

  watch(
    [() => session.authenticated, () => route.query.notification],
    async ([authenticated, candidate]) => {
      if (
        !authenticated ||
        !navigator.onLine ||
        !isNotificationId(candidate) ||
        processed.has(candidate)
      ) {
        return;
      }
      processed.add(candidate);
      try {
        await markNotificationAsRead(candidate);
        await queryClient.invalidateQueries({
          queryKey: notificationKeys.all,
        });
      } catch {
        processed.delete(candidate);
      }
    },
    { immediate: true },
  );
});
