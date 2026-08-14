<script setup lang="ts">
import { CalendarDays, Gauge } from 'lucide-vue-next';
import type { MaintenanceAgendaEntry } from '~/types/api';
import { dimensionMessageKey, statusTone } from '~/utils/maintenance';

const props = defineProps<{
  entry: MaintenanceAgendaEntry;
  compact?: boolean;
}>();
const { t, n } = useI18n();

const params = (kind: 'time' | 'odometer') => {
  if (kind === 'time') {
    const value = props.entry.status.timeStatus;
    return { count: value.overdueByDays ?? value.remainingDays ?? 0, km: n(0) };
  }
  const value = props.entry.status.odometerStatus;
  return {
    count: 0,
    km: n(value.overdueByKm ?? value.remainingKm ?? value.dueAtKm ?? 0),
  };
};
</script>

<template>
  <article class="maintenance-status" :class="{ compact }">
    <header>
      <div>
        <p class="category">
          {{ t(`maintenance.categories.${entry.plan.category}`) }}
        </p>
        <h3>{{ entry.plan.name }}</h3>
      </div>
      <AppStatusBadge
        :status="statusTone(entry.status.overallStatus)"
        :label="t(`maintenance.status.overall.${entry.status.overallStatus}`)"
      />
    </header>
    <div class="dimensions">
      <p>
        <CalendarDays :size="17" aria-hidden="true" />
        <span>{{ t('maintenance.status.timeLabel') }}</span>
        <strong>{{
          t(
            dimensionMessageKey(entry.status.timeStatus, 'time'),
            params('time'),
          )
        }}</strong>
      </p>
      <p>
        <Gauge :size="17" aria-hidden="true" />
        <span>{{ t('maintenance.status.odometerLabel') }}</span>
        <strong>{{
          t(
            dimensionMessageKey(entry.status.odometerStatus, 'odometer'),
            params('odometer'),
          )
        }}</strong>
      </p>
    </div>
    <footer v-if="$slots.actions"><slot name="actions" /></footer>
  </article>
</template>

<style scoped>
.maintenance-status {
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--border);
}
header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
h3,
p {
  margin: 0;
}
.category {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 720;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.dimensions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.9rem;
}
.dimensions p {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 0.5rem;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.82rem;
}
.dimensions strong {
  grid-column: 2;
  color: var(--text);
  font-weight: 620;
}
.compact .dimensions {
  grid-template-columns: 1fr;
}
footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.85rem;
}
@media (max-width: 38rem) {
  .dimensions {
    grid-template-columns: 1fr;
  }
  header {
    flex-direction: column;
  }
}
</style>
