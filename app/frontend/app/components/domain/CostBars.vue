<script setup lang="ts">
import { computed } from 'vue';
import type { ApiSchemas } from '~/types/api';
import {
  decimalRatioPercent,
  decimalToMinorUnits,
  formatDecimalCurrency,
} from '~/utils/formatters';
const props = defineProps<{ buckets: ApiSchemas['CostReportBucketDto'][] }>();
const { t, locale } = useI18n();
const maximum = computed(() =>
  props.buckets.reduce((max, bucket) => {
    const left = decimalToMinorUnits(max) ?? 0n;
    const right = decimalToMinorUnits(bucket.total) ?? 0n;
    return right > left ? bucket.total : max;
  }, '0.00'),
);
</script>
<template>
  <ul class="cost-bars" :aria-label="t('reports.chart.summary')">
    <li v-for="bucket in buckets" :key="bucket.period" class="cost-bar">
      <span class="cost-bar__value">{{
        formatDecimalCurrency(bucket.total, locale)
      }}</span>
      <span class="cost-bar__track" aria-hidden="true"
        ><span
          :style="{ width: `${decimalRatioPercent(bucket.total, maximum)}%` }"
      /></span>
      <span class="cost-bar__period">{{ bucket.period }}</span>
    </li>
  </ul>
</template>
<style scoped>
.cost-bars {
  display: grid;
  gap: 0.7rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.cost-bar {
  display: grid;
  grid-template-columns: minmax(7rem, auto) 1fr 5rem;
  gap: 0.75rem;
  align-items: center;
}
.cost-bar__value {
  font-variant-numeric: tabular-nums;
  font-weight: 680;
}
.cost-bar__track {
  height: 0.55rem;
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.cost-bar__track span {
  display: block;
  height: 100%;
  background: var(--primary);
}
.cost-bar__period {
  text-align: right;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 32rem) {
  .cost-bar {
    grid-template-columns: 1fr 4.5rem;
  }
  .cost-bar__track {
    grid-row: 2;
    grid-column: 1/-1;
  }
}
</style>
