<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import {
  listMaintenancePlans,
  listMaintenanceRecords,
  maintenanceKeys,
} from '~/services/api/maintenance';
import { maintenanceRecordQuery } from '~/utils/maintenance-records';
import { formatDecimalCurrency } from '~/utils/formatters';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t, n, locale } = useI18n();
const id = computed(() => String(route.params.id));
const page = ref(1);
const planId = ref('');
const limit = 20;
const filters = computed(() =>
  maintenanceRecordQuery(page.value, limit, planId.value || undefined),
);
const recordsQuery = useQuery({
  queryKey: computed(() => maintenanceKeys.records(id.value, filters.value)),
  queryFn: () => listMaintenanceRecords(id.value, filters.value),
});
const plansQuery = useQuery({
  queryKey: computed(() =>
    maintenanceKeys.plans(id.value, { page: 1, limit: 100 }),
  ),
  queryFn: () => listMaintenancePlans(id.value, { page: 1, limit: 100 }),
});
const planOptions = computed(() => [
  { label: t('maintenance.records.filters.allPlans'), value: '' },
  ...(plansQuery.data.value?.data ?? []).map((plan) => ({
    label: plan.name,
    value: plan.id,
  })),
]);
watch(planId, () => {
  page.value = 1;
});
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(value),
  );
const formatMoney = (value: string) =>
  formatDecimalCurrency(value, locale.value);
useHead({ title: computed(() => t('maintenance.records.list.metaTitle')) });
</script>

<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.records.list.eyebrow') }}</p>
        <h1>{{ t('maintenance.records.list.title') }}</h1>
        <p>{{ t('maintenance.records.list.description') }}</p>
      </div>
      <NuxtLink class="button-link" :to="`/vehicles/${id}/history/new`">{{
        t('maintenance.records.list.create')
      }}</NuxtLink>
    </header>
    <nav class="vehicle-tabs" :aria-label="t('maintenance.vehicleNavigation')">
      <NuxtLink :to="`/vehicles/${id}`">{{
        t('maintenance.links.vehicle')
      }}</NuxtLink>
      <NuxtLink :to="`/vehicles/${id}/agenda`">{{
        t('maintenance.links.agenda')
      }}</NuxtLink>
      <NuxtLink :to="`/vehicles/${id}/plans`">{{
        t('maintenance.links.plans')
      }}</NuxtLink>
      <NuxtLink :to="`/vehicles/${id}/expenses`">{{
        t('maintenance.links.expenses')
      }}</NuxtLink>
    </nav>
    <AppSelect
      id="record-plan-filter"
      v-model="planId"
      compact
      :label="t('maintenance.records.filters.plan')"
      :options="planOptions"
    />
    <AppSkeleton v-if="recordsQuery.isPending.value" />
    <AppErrorState
      v-else-if="recordsQuery.isError.value"
      :title="t('maintenance.records.list.errorTitle')"
      :description="t('maintenance.records.list.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="recordsQuery.refetch()"
    />
    <AppEmptyState
      v-else-if="!recordsQuery.data.value?.data.length"
      :title="t('maintenance.records.list.emptyTitle')"
      :description="t('maintenance.records.list.emptyDescription')"
    >
      <NuxtLink class="button-link" :to="`/vehicles/${id}/history/new`">{{
        t('maintenance.records.list.create')
      }}</NuxtLink>
    </AppEmptyState>
    <ol
      v-else
      class="record-list"
      :aria-label="t('maintenance.records.list.label')"
    >
      <li v-for="record in recordsQuery.data.value.data" :key="record.id">
        <NuxtLink :to="`/vehicles/${id}/history/${record.id}`">
          <div>
            <time :datetime="record.performedAt">{{
              formatDate(record.performedAt)
            }}</time>
            <h2>{{ record.description }}</h2>
            <p>
              {{ n(record.odometerKm) }} km<span v-if="record.workshop">
                · {{ record.workshop }}</span
              >
            </p>
          </div>
          <strong class="tabular">{{ formatMoney(record.totalCost) }}</strong>
        </NuxtLink>
      </li>
    </ol>
    <nav
      v-if="(recordsQuery.data.value?.meta.totalPages ?? 0) > 1"
      class="pagination"
      :aria-label="t('maintenance.records.list.pagination')"
    >
      <AppButton variant="secondary" :disabled="page <= 1" @click="page--">{{
        t('actions.previous')
      }}</AppButton>
      <span>{{
        t('maintenance.records.list.page', {
          page,
          total: recordsQuery.data.value?.meta.totalPages,
        })
      }}</span>
      <AppButton
        variant="secondary"
        :disabled="page >= (recordsQuery.data.value?.meta.totalPages ?? 1)"
        @click="page++"
        >{{ t('actions.next') }}</AppButton
      >
    </nav>
  </div>
</template>

<style scoped>
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
.record-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--border);
}
.record-list a {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  color: var(--text);
  border-bottom: 1px solid var(--border);
  text-decoration: none;
}
.record-list a:hover {
  background: var(--surface-muted);
}
.record-list h2,
.record-list p {
  margin: 0.2rem 0;
}
.record-list time,
.record-list p {
  color: var(--text-muted);
  font-size: 0.85rem;
}
@media (max-width: 38rem) {
  .record-list a {
    flex-direction: column;
  }
}
</style>
