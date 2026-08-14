<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getCostReport, reportKeys } from '~/services/api/expenses';
import { listVehicles, vehicleKeys } from '~/services/api/vehicles';
import type { CostReportPeriod, ExpenseCategory } from '~/types/api';
import { zonedLocalDateTimeToIso } from '~/utils/date-time';
import { formatDecimalCurrency } from '~/utils/formatters';
definePageMeta({ middleware: 'auth' });
const { t, locale } = useI18n();
const session = useSessionStore();
const selection = useVehicleSelectionStore();
const period = ref<CostReportPeriod>('monthly');
const from = ref('');
const to = ref('');
const vehicles = useQuery({ queryKey: vehicleKeys.all, queryFn: listVehicles });
const vehicleId = computed(
  () => selection.selectedId ?? vehicles.data.value?.data[0]?.id ?? '',
);
const timezone = computed(() => session.user?.timezone ?? 'America/Sao_Paulo');
const filters = computed(() => ({
  vehicleId: vehicleId.value,
  period: period.value,
  ...(from.value
    ? {
        from: zonedLocalDateTimeToIso(`${from.value}T00:00:00`, timezone.value),
      }
    : {}),
  ...(to.value
    ? {
        to: zonedLocalDateTimeToIso(`${to.value}T23:59:59.999`, timezone.value),
      }
    : {}),
}));
const report = useQuery({
  queryKey: computed(() => reportKeys.costs(filters.value)),
  queryFn: () => getCostReport(filters.value),
  enabled: computed(() => Boolean(vehicleId.value)),
});
const periodOptions = computed(() => [
  { value: 'monthly', label: t('reports.filters.monthly') },
  { value: 'yearly', label: t('reports.filters.yearly') },
]);
useHead({ title: computed(() => t('reports.metaTitle')) });
</script>
<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('reports.eyebrow') }}</p>
        <h1>{{ t('reports.title') }}</h1>
        <p>{{ t('reports.description') }}</p>
      </div>
    </header>
    <div class="report-filters">
      <AppSelect
        id="report-period"
        v-model="period"
        compact
        :label="t('reports.filters.period')"
        :options="periodOptions"
      />
      <div class="ui-native-field">
        <label for="report-from">{{ t('reports.filters.from') }}</label
        ><input id="report-from" v-model="from" type="date" />
      </div>
      <div class="ui-native-field">
        <label for="report-to">{{ t('reports.filters.to') }}</label
        ><input id="report-to" v-model="to" type="date" />
      </div>
    </div>
    <p class="timezone-note">
      {{ t('reports.filters.timezone', { timezone }) }}
    </p>
    <AppSkeleton
      v-if="vehicles.isPending.value || report.isPending.value"
    /><AppErrorState
      v-else-if="vehicles.isError.value || report.isError.value"
      :title="t('reports.errorTitle')"
      :description="t('reports.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="
        () => {
          vehicles.refetch();
          report.refetch();
        }
      "
    /><AppEmptyState
      v-else-if="!vehicleId"
      :title="t('vehicles.list.emptyTitle')"
      :description="t('vehicles.list.emptyDescription')"
    /><template v-else-if="report.data.value"
      ><CostSummary :summary="report.data.value.summary" />
      <section class="report-section">
        <h2>{{ t('reports.chart.title') }}</h2>
        <p>{{ t('reports.chart.description') }}</p>
        <AppEmptyState
          v-if="!report.data.value.buckets.length"
          :title="t('reports.emptyTitle')"
          :description="t('reports.emptyDescription')"
        /><CostBars v-else :buckets="report.data.value.buckets" />
        <p class="chart-note">{{ t('reports.chart.omittedBuckets') }}</p>
      </section>
      <section class="report-section">
        <h2>{{ t('reports.categories.title') }}</h2>
        <p>{{ t('reports.categories.description') }}</p>
        <ul class="category-costs">
          <li
            v-for="item in report.data.value.summary.expensesByCategory"
            :key="item.category"
          >
            <span>{{
              t(`expenses.categories.${item.category as ExpenseCategory}`)
            }}</span
            ><strong>{{ formatDecimalCurrency(item.total, locale) }}</strong>
          </li>
        </ul>
        <p>{{ t('reports.categories.disclaimer') }}</p>
      </section></template
    >
  </div>
</template>
<style scoped>
.report-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 15rem));
  gap: 1rem;
  align-items: end;
}
.timezone-note,
.chart-note {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.report-section {
  padding: 1.5rem 0;
  border-top: 1px solid var(--border);
}
.category-costs {
  max-width: 34rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.category-costs li {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border);
}
@media (max-width: 48rem) {
  .report-filters {
    grid-template-columns: 1fr;
  }
}
</style>
