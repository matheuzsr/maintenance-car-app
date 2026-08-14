<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import {
  getMaintenanceAgenda,
  maintenanceKeys,
} from '~/services/api/maintenance';
import type { MaintenanceDueStatus } from '~/types/api';
import { sortAgendaByUrgency } from '~/utils/maintenance';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t } = useI18n();
const id = computed(() => String(route.params.id));
const status = ref<MaintenanceDueStatus | ''>('');
const query = useQuery({
  queryKey: computed(() =>
    maintenanceKeys.agenda(id.value, status.value || undefined),
  ),
  queryFn: () => getMaintenanceAgenda(id.value, status.value || undefined),
});
const entries = computed(() => sortAgendaByUrgency(query.data.value ?? []));
const statusOptions = computed(() => [
  { label: t('maintenance.filters.allStatuses'), value: '' },
  ...(
    [
      'OVERDUE',
      'DUE_SOON',
      'UNKNOWN',
      'ON_TRACK',
      'NOT_CONFIGURED',
    ] as MaintenanceDueStatus[]
  ).map((value) => ({
    label: t(`maintenance.status.overall.${value}`),
    value,
  })),
]);
useHead({ title: computed(() => t('maintenance.agenda.metaTitle')) });
</script>

<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.agenda.eyebrow') }}</p>
        <h1>{{ t('maintenance.agenda.title') }}</h1>
        <p>{{ t('maintenance.agenda.description') }}</p>
      </div>
      <NuxtLink class="button-link" :to="`/vehicles/${id}/plans/new`">{{
        t('maintenance.plans.create')
      }}</NuxtLink>
    </header>
    <nav class="vehicle-tabs" :aria-label="t('maintenance.vehicleNavigation')">
      <NuxtLink :to="`/vehicles/${id}`">{{
        t('maintenance.links.vehicle')
      }}</NuxtLink
      ><NuxtLink :to="`/vehicles/${id}/plans`">{{
        t('maintenance.links.plans')
      }}</NuxtLink>
    </nav>
    <AppSkeleton v-if="query.isPending.value" />
    <AppErrorState
      v-else-if="query.isError.value"
      :title="t('maintenance.agenda.errorTitle')"
      :description="t('maintenance.agenda.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <template v-else>
      <AppSelect
        id="agenda-status"
        v-model="status"
        compact
        :label="t('maintenance.filters.status')"
        :options="statusOptions"
      />
      <AppEmptyState
        v-if="!entries.length"
        :title="
          status
            ? t('maintenance.agenda.filteredEmptyTitle')
            : t('maintenance.agenda.emptyTitle')
        "
        :description="
          status
            ? t('maintenance.agenda.filteredEmptyDescription')
            : t('maintenance.agenda.emptyDescription')
        "
        ><NuxtLink class="button-link" :to="`/vehicles/${id}/plans/new`">{{
          t('maintenance.plans.create')
        }}</NuxtLink></AppEmptyState
      >
      <section
        v-else
        class="agenda-list"
        :aria-label="t('maintenance.agenda.listLabel')"
      >
        <MaintenanceStatus
          v-for="entry in entries"
          :key="entry.plan.id"
          :entry="entry"
        >
          <template #actions>
            <NuxtLink
              class="text-link"
              :to="`/vehicles/${id}/plans/${entry.plan.id}/complete`"
              >{{ t('maintenance.records.complete.action') }}</NuxtLink
            >
          </template>
        </MaintenanceStatus>
      </section>
    </template>
  </div>
</template>

<style scoped>
.agenda-list {
  padding: 0 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 0.25rem solid var(--primary);
}
.vehicle-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid var(--border);
}
.vehicle-tabs a {
  padding: 0.6rem 0;
  color: var(--primary);
  font-weight: 680;
}
</style>
