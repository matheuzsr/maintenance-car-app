<script setup lang="ts">
import { Bell, CarFront, ChevronRight } from 'lucide-vue-next';
import { useQuery } from '@tanstack/vue-query';
import { listVehicles, vehicleKeys } from '~/services/api/vehicles';
import {
  listNotifications,
  notificationKeys,
} from '~/services/api/notifications';
import { vehicleSelectionTarget } from '~/utils/vehicle-navigation';

const { t } = useI18n();
const preferences = usePreferencesStore();
const { isOnline } = useOnlineStatus();
const createOpen = ref(false);
const session = useSessionStore();
const selection = useVehicleSelectionStore();
const route = useRoute();
const vehiclesQuery = useQuery({
  queryKey: vehicleKeys.all,
  queryFn: listVehicles,
  enabled: computed(() => session.authenticated),
});
const unreadQuery = useQuery({
  queryKey: notificationKeys.unread(),
  queryFn: () => listNotifications({ page: 1, limit: 1, unreadOnly: true }),
  enabled: computed(() => session.authenticated),
  refetchInterval: 60_000,
});
const unreadTotal = computed(() => unreadQuery.data.value?.meta.total ?? 0);
const vehicles = computed(() =>
  (vehiclesQuery.data.value?.data ?? []).map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.nickname} · ${vehicle.brand} ${vehicle.model}`,
  })),
);
const selectedVehicle = computed({
  get: () => selection.selectedId,
  set: async (id) => {
    if (!id) return;
    selection.select(id);
    const routeId =
      typeof route.params.id === 'string' ? route.params.id : undefined;
    await navigateTo(
      vehicleSelectionTarget(route.path, { ...route.query }, routeId, id),
    );
  },
});
const quickActions = computed(() => [
  {
    id: 'odometer',
    to: selection.selectedId
      ? `/vehicles/${selection.selectedId}/odometer`
      : '/vehicles',
    disabled: !selection.selectedId || !isOnline.value,
  },
  {
    id: 'maintenance',
    to: selection.selectedId
      ? `/vehicles/${selection.selectedId}/history/new`
      : '/vehicles',
    disabled: !selection.selectedId || !isOnline.value,
  },
  {
    id: 'expense',
    to: selection.selectedId
      ? `/vehicles/${selection.selectedId}/expenses/new`
      : '/vehicles',
    disabled: !selection.selectedId || !isOnline.value,
  },
]);
async function openQuickAction(to: string): Promise<void> {
  createOpen.value = false;
  await navigateTo(to);
}

watch(
  () => vehiclesQuery.data.value?.data,
  (items) => {
    if (!items) return;
    const routeId =
      typeof route.params.id === 'string' ? route.params.id : undefined;
    selection.reconcile(
      items.map(({ id }) => id),
      routeId ??
        (typeof route.query.vehicle === 'string'
          ? route.query.vehicle
          : undefined),
    );
  },
  { immediate: true },
);

watch(
  () => route.params.id,
  (routeId) => {
    if (
      typeof routeId === 'string' &&
      vehicles.value.some(({ id }) => id === routeId)
    )
      selection.select(routeId);
  },
  { immediate: true },
);

onMounted(() => {
  preferences.initialize();
  selection.initialize(
    typeof route.query.vehicle === 'string' ? route.query.vehicle : undefined,
  );
});
onUnmounted(preferences.dispose);
</script>

<template>
  <div class="app-frame">
    <a class="skip-link" href="#main-content">{{ t('a11y.skipToContent') }}</a>
    <AppOfflineBanner
      v-if="!isOnline"
      :message="t('states.offline.description')"
    />

    <aside class="app-rail">
      <NuxtLink to="/" class="rail-brand" :aria-label="t('app.name')">
        <span class="rail-brand__mark" aria-hidden="true">G</span>
        <span>{{ t('app.name') }}</span>
      </NuxtLink>
      <AppNavigation @create="createOpen = true" />
      <div class="rail-footer">
        <ThemeControl />
        <span>{{ t('shell.version') }}</span>
      </div>
    </aside>

    <div class="app-workspace">
      <header class="app-header">
        <NuxtLink to="/" class="mobile-brand" :aria-label="t('app.name')">
          <span aria-hidden="true">G</span>
        </NuxtLink>
        <VehicleSwitcher
          v-model="selectedVehicle"
          :vehicles="vehicles"
          :label="t('vehicles.switcherLabel')"
        />
        <div class="header-actions">
          <NuxtLink
            to="/vehicles"
            class="icon-action"
            :aria-label="t('navigation.vehicles')"
          >
            <CarFront :size="20" :stroke-width="1.75" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink
            to="/notifications"
            class="icon-action"
            :aria-label="t('navigation.notifications')"
          >
            <Bell :size="20" :stroke-width="1.75" aria-hidden="true" />
            <span v-if="unreadTotal > 0" class="notification-dot"
              ><span class="sr-only">{{
                t('navigation.unreadNotifications', unreadTotal)
              }}</span></span
            >
          </NuxtLink>
        </div>
      </header>
      <main id="main-content" class="app-main" tabindex="-1"><slot /></main>
    </div>

    <div class="mobile-navigation-wrap">
      <AppNavigation mobile @create="createOpen = true" />
    </div>

    <AppDialog
      v-model="createOpen"
      :title="t('quickAction.title')"
      :close-label="t('actions.close')"
    >
      <p class="quick-action-copy">{{ t('quickAction.description') }}</p>
      <div class="quick-action-list">
        <button
          v-for="action in quickActions"
          :key="action.id"
          type="button"
          :disabled="action.disabled"
          @click="openQuickAction(action.to)"
        >
          <span>{{ t(`quickAction.${action.id}`) }}</span>
          <ChevronRight :size="18" aria-hidden="true" />
        </button>
      </div>
      <template #footer
        ><small>{{ t('quickAction.futureHint') }}</small></template
      >
    </AppDialog>
  </div>
</template>

<style scoped>
.app-frame {
  min-height: 100dvh;
}
.app-rail {
  position: fixed;
  z-index: 20;
  inset: 0 auto 0 0;
  width: 15rem;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 1rem;
  background: var(--surface);
  border-right: 1px solid var(--border);
}
.rail-brand {
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  color: var(--text);
  font-weight: 780;
  letter-spacing: -0.025em;
  text-decoration: none;
}
.rail-brand__mark,
.mobile-brand span {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  color: var(--on-primary);
  background: var(--primary);
  border-radius: var(--radius-sm);
}
.rail-footer {
  display: grid;
  gap: 1rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
}
.app-workspace {
  min-height: 100dvh;
  margin-left: 15rem;
}
.app-header {
  min-height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.625rem clamp(1rem, 3vw, 2.25rem);
  background: color-mix(in srgb, var(--canvas) 92%, transparent);
  border-bottom: 1px solid var(--border);
}
.app-header :deep(.ui-select-field) {
  width: min(18rem, 45vw);
}
.mobile-brand {
  display: none;
  text-decoration: none;
}
.header-actions {
  display: flex;
  gap: 0.25rem;
}
.icon-action {
  position: relative;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.icon-action:hover {
  color: var(--text);
  background: var(--surface-muted);
}
.notification-dot {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 0.45rem;
  height: 0.45rem;
  background: var(--danger);
  border: 2px solid var(--canvas);
  border-radius: 50%;
}
.app-main {
  width: min(100%, 88rem);
  margin-inline: auto;
  padding: clamp(1.25rem, 3vw, 2.5rem);
}
.mobile-navigation-wrap {
  position: fixed;
  z-index: 30;
  inset: auto 0 0;
}
.quick-action-copy {
  margin: 0 0 1rem;
  color: var(--text-muted);
}
.quick-action-list {
  display: grid;
  border-block: 1px solid var(--border);
}
.quick-action-list button {
  min-height: 3.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--border);
}
.quick-action-list button:last-child {
  border-bottom: 0;
}
small {
  color: var(--text-muted);
}
@media (max-width: 63.99rem) {
  .app-rail {
    display: none;
  }
  .app-workspace {
    margin-left: 0;
    padding-bottom: var(--bottom-nav-height);
  }
  .app-header {
    justify-content: space-between;
  }
  .mobile-brand {
    display: block;
  }
}
@media (min-width: 64rem) {
  .mobile-navigation-wrap {
    display: none;
  }
}
</style>
