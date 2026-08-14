<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { CalendarClock, Gauge, ChevronRight } from 'lucide-vue-next';
import {
  listNotifications,
  markNotificationAsRead,
  notificationKeys,
} from '~/services/api/notifications';
import { notificationDeepLink } from '~/utils/notifications';
import type { MaintenanceNotification } from '~/types/api';

definePageMeta({ middleware: 'auth' });
const { t, locale } = useI18n();
const queryClient = useQueryClient();
useHead({ title: computed(() => t('notifications.inbox.metaTitle')) });
const page = ref(1);
const unreadOnly = ref(false);
const filters = computed(() => ({
  page: page.value,
  limit: 20,
  unreadOnly: unreadOnly.value,
}));
const query = useQuery({
  queryKey: computed(() => notificationKeys.list(filters.value)),
  queryFn: () => listNotifications(filters.value),
});
const readMutation = useMutation({
  mutationFn: (notification: MaintenanceNotification) =>
    notification.readAt
      ? Promise.resolve(notification)
      : markNotificationAsRead(notification.id),
  onSuccess: async (notification) => {
    await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    await navigateTo(
      notificationDeepLink(notification.vehicleId, notification.id),
    );
  },
});

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

function changeUnreadFilter(value: boolean): void {
  unreadOnly.value = value;
  page.value = 1;
}
</script>

<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('notifications.inbox.eyebrow') }}</p>
        <h1>{{ t('notifications.inbox.title') }}</h1>
        <p>{{ t('notifications.inbox.description') }}</p>
      </div>
      <NuxtLink class="button-link secondary" to="/settings/notifications">
        {{ t('notifications.inbox.settings') }}
      </NuxtLink>
    </header>

    <label class="unread-filter">
      <input
        :checked="unreadOnly"
        type="checkbox"
        @change="
          changeUnreadFilter(($event.target as HTMLInputElement).checked)
        "
      />
      <span>{{ t('notifications.inbox.unreadOnly') }}</span>
    </label>

    <AppSkeleton v-if="query.isPending.value" />
    <AppErrorState
      v-else-if="query.isError.value"
      :title="t('notifications.inbox.errorTitle')"
      :description="t('notifications.inbox.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <AppEmptyState
      v-else-if="query.data.value?.data.length === 0"
      :title="t('notifications.inbox.emptyTitle')"
      :description="
        t(
          unreadOnly
            ? 'notifications.inbox.noUnreadDescription'
            : 'notifications.inbox.emptyDescription',
        )
      "
    />
    <template v-else>
      <p v-if="readMutation.isError.value" class="form-error" role="alert">
        {{ t('notifications.inbox.readError') }}
      </p>
      <ol
        class="notification-list"
        :aria-label="t('notifications.inbox.listLabel')"
      >
        <li
          v-for="notification in query.data.value?.data"
          :key="notification.id"
        >
          <button
            type="button"
            class="notification-item"
            :class="{ 'notification-item--unread': !notification.readAt }"
            :disabled="readMutation.isPending.value"
            @click="readMutation.mutate(notification)"
          >
            <span class="notification-item__icon" aria-hidden="true">
              <CalendarClock
                v-if="notification.trigger === 'DATE'"
                :size="20"
              />
              <Gauge v-else :size="20" />
            </span>
            <span class="notification-item__content">
              <span class="notification-item__topline">
                <strong>{{ notification.title }}</strong>
                <AppStatusBadge
                  :status="
                    notification.severity === 'OVERDUE' ? 'danger' : 'warning'
                  "
                  :label="t(`notifications.severity.${notification.severity}`)"
                />
              </span>
              <span>{{ notification.body }}</span>
              <small class="tabular">{{
                formatDate(notification.createdAt)
              }}</small>
            </span>
            <span v-if="!notification.readAt" class="unread-mark">
              <span class="sr-only">{{ t('notifications.inbox.unread') }}</span>
            </span>
            <ChevronRight :size="18" aria-hidden="true" />
          </button>
        </li>
      </ol>

      <nav
        v-if="(query.data.value?.meta.totalPages ?? 1) > 1"
        class="pagination"
        :aria-label="t('notifications.inbox.pagination')"
      >
        <AppButton
          variant="secondary"
          :disabled="page <= 1"
          @click="page -= 1"
          >{{ t('actions.previous') }}</AppButton
        >
        <span class="tabular">{{
          t('notifications.inbox.page', {
            page,
            total: query.data.value?.meta.totalPages ?? 1,
          })
        }}</span>
        <AppButton
          variant="secondary"
          :disabled="page >= (query.data.value?.meta.totalPages ?? 1)"
          @click="page += 1"
          >{{ t('actions.next') }}</AppButton
        >
      </nav>
    </template>
  </div>
</template>

<style scoped>
.unread-filter {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: fit-content;
  color: var(--text-muted);
  font-weight: 680;
}
.unread-filter input {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--primary);
}
.notification-list {
  margin: 0;
  padding: 0;
  background: var(--surface);
  border-block: 1px solid var(--border);
  list-style: none;
}
.notification-list li + li {
  border-top: 1px solid var(--border);
}
.notification-item {
  width: 100%;
  min-height: 5.5rem;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 0.875rem;
  align-items: center;
  padding: 1rem;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}
.notification-item:hover {
  background: var(--surface-muted);
}
.notification-item--unread {
  color: var(--text);
  background: color-mix(in srgb, var(--primary-soft) 38%, var(--surface));
}
.notification-item__icon {
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: var(--radius-sm);
}
.notification-item__content {
  min-width: 0;
  display: grid;
  gap: 0.3rem;
}
.notification-item__topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.notification-item small {
  color: var(--text-muted);
}
.unread-mark {
  width: 0.55rem;
  height: 0.55rem;
  background: var(--primary);
  border-radius: 50%;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
@media (max-width: 40rem) {
  .entity-heading {
    display: grid;
  }
  .notification-item {
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding-inline: 0.75rem;
  }
  .notification-item > svg {
    display: none;
  }
}
</style>
