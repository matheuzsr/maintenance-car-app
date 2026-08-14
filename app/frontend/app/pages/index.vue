<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { CarFront, CircleGauge } from 'lucide-vue-next';
import {
  getMaintenanceAgenda,
  maintenanceKeys,
} from '~/services/api/maintenance';
import { listVehicles, vehicleKeys } from '~/services/api/vehicles';
import { sortAgendaByUrgency } from '~/utils/maintenance';

definePageMeta({ middleware: 'auth' });
const { t, n, locale } = useI18n();
const today = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'full' }).format(
    new Date(),
  ),
);
const selection = useVehicleSelectionStore();
useHead({ title: computed(() => t('dashboard.metaTitle')) });
const query = useQuery({ queryKey: vehicleKeys.all, queryFn: listVehicles });
const vehicle = computed(
  () =>
    query.data.value?.data.find(({ id }) => id === selection.selectedId) ??
    query.data.value?.data[0],
);
const agenda = useQuery({
  queryKey: computed(() => maintenanceKeys.agenda(vehicle.value?.id ?? 'none')),
  queryFn: () => getMaintenanceAgenda(vehicle.value!.id),
  enabled: computed(() => Boolean(vehicle.value)),
});
const urgent = computed(() =>
  sortAgendaByUrgency(agenda.data.value ?? []).slice(0, 3),
);
const overdueCount = computed(
  () =>
    (agenda.data.value ?? []).filter(
      (entry) => entry.status.overallStatus === 'OVERDUE',
    ).length,
);
watch(
  () => query.data.value?.data,
  (items) => {
    if (items) selection.reconcile(items.map(({ id }) => id));
  },
  { immediate: true },
);
</script>
<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ today }}</p>
        <h1>{{ t('dashboard.title') }}</h1>
        <p>{{ t('dashboard.realSubtitle') }}</p>
      </div>
    </header>
    <AppSkeleton v-if="query.isPending.value" />
    <AppErrorState
      v-else-if="query.isError.value"
      :title="t('dashboard.loadErrorTitle')"
      :description="t('dashboard.loadErrorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <AppEmptyState
      v-else-if="!vehicle"
      :title="t('vehicles.list.emptyTitle')"
      :description="t('vehicles.list.emptyDescription')"
      ><NuxtLink class="button-link" to="/vehicles/new">{{
        t('vehicles.list.create')
      }}</NuxtLink></AppEmptyState
    >
    <template v-else>
      <section class="vehicle-summary">
        <CarFront :size="26" aria-hidden="true" />
        <div>
          <p>{{ t('dashboard.vehicleSelected') }}</p>
          <h2>{{ vehicle.nickname }}</h2>
          <span
            >{{ vehicle.brand }} {{ vehicle.model }} · {{ vehicle.year }}</span
          >
        </div>
        <div class="summary-odometer">
          <CircleGauge :size="20" aria-hidden="true" /><strong class="tabular"
            >{{ n(vehicle.currentOdometerKm) }} km</strong
          >
        </div>
      </section>
      <div class="dashboard-actions">
        <NuxtLink
          class="button-link"
          :to="`/vehicles/${vehicle.id}/odometer`"
          >{{ t('dashboard.odometer.action') }}</NuxtLink
        ><NuxtLink
          class="button-link secondary"
          :to="`/vehicles/${vehicle.id}`"
          >{{ t('actions.seeDetails') }}</NuxtLink
        >
      </div>
      <section class="maintenance-panel">
        <p class="eyebrow">{{ t('dashboard.timeline.eyebrow') }}</p>
        <h2>{{ t('dashboard.timeline.title') }}</h2>
        <p class="attention">
          {{ t('dashboard.timeline.attention', overdueCount) }}
        </p>
        <AppSkeleton v-if="agenda.isPending.value" />
        <AppErrorState
          v-else-if="agenda.isError.value"
          :title="t('maintenance.agenda.errorTitle')"
          :description="t('maintenance.agenda.errorDescription')"
          :retry-label="t('actions.tryAgain')"
          @retry="agenda.refetch()"
        />
        <AppEmptyState
          v-else-if="!urgent.length"
          :title="t('maintenance.agenda.emptyTitle')"
          :description="t('maintenance.agenda.emptyDescription')"
        />
        <div v-else>
          <MaintenanceStatus
            v-for="entry in urgent"
            :key="entry.plan.id"
            :entry="entry"
            compact
          />
        </div>
        <NuxtLink class="text-link" :to="`/vehicles/${vehicle.id}/agenda`">{{
          t('dashboard.timeline.openAgenda')
        }}</NuxtLink>
      </section>
    </template>
  </div>
</template>
<style scoped>
.vehicle-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
}
.vehicle-summary p,
.vehicle-summary h2 {
  margin: 0;
}
.vehicle-summary span,
.future-panel > p:last-of-type {
  color: var(--text-muted);
}
.summary-odometer {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.35rem;
}
.dashboard-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.maintenance-panel {
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-top: 0.25rem solid var(--primary);
  background: var(--surface);
}
.maintenance-panel h2 {
  margin: 0.25rem 0;
}
.attention {
  color: var(--text-muted);
}
@media (max-width: 40rem) {
  .vehicle-summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .summary-odometer {
    width: 100%;
    margin: 1rem 0 0;
  }
}
</style>
