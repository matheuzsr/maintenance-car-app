<script setup lang="ts">
import type { ApiSchemas } from '~/types/api';
import { formatDecimalCurrency } from '~/utils/formatters';

defineProps<{ summary: ApiSchemas['CostTotalsDto'] }>();
const { t, locale } = useI18n();
const money = (value: string) => formatDecimalCurrency(value, locale.value);
</script>

<template>
  <section class="report-summary" aria-labelledby="report-total">
    <div>
      <p>{{ t('reports.summary.total') }}</p>
      <h2 id="report-total">{{ money(summary.total) }}</h2>
      <span>{{ t('reports.summary.noDoubleCount') }}</span>
    </div>
    <dl>
      <div>
        <dt>{{ t('reports.summary.service') }}</dt>
        <dd>{{ money(summary.serviceCost) }}</dd>
      </div>
      <div>
        <dt>{{ t('reports.summary.standalone') }}</dt>
        <dd>{{ money(summary.additionalExpenses) }}</dd>
      </div>
      <div>
        <dt>{{ t('reports.summary.linked') }}</dt>
        <dd>{{ money(summary.linkedItemizedExpenses) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.report-summary {
  display: grid;
  grid-template-columns: minmax(15rem, 1fr) 2fr;
  gap: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-top: 0.25rem solid var(--primary);
  background: var(--surface);
}
.report-summary p,
.report-summary h2 {
  margin: 0.2rem 0;
}
.report-summary h2 {
  font-size: clamp(2rem, 6vw, 3.4rem);
  font-variant-numeric: tabular-nums;
}
.report-summary span {
  color: var(--text-muted);
}
dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
dt {
  color: var(--text-muted);
  font-size: 0.8rem;
}
dd {
  margin: 0.4rem 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 48rem) {
  .report-summary,
  dl {
    grid-template-columns: 1fr;
  }
  .report-summary {
    gap: 1rem;
  }
}
</style>
