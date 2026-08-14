<script setup lang="ts">
import {
  ArrowUpRight,
  CalendarDays,
  CircleGauge,
  Clock3,
  Wrench,
} from 'lucide-vue-next';

const { t } = useI18n();
useHead({ title: computed(() => t('dashboard.metaTitle')) });

const upcoming = computed(() => [
  {
    key: 'oil',
    date: t('dashboard.items.oil.date'),
    distance: t('dashboard.items.oil.distance'),
    status: 'warning' as const,
  },
  {
    key: 'brakes',
    date: t('dashboard.items.brakes.date'),
    distance: t('dashboard.items.brakes.distance'),
    status: 'danger' as const,
  },
  {
    key: 'alignment',
    date: t('dashboard.items.alignment.date'),
    distance: t('dashboard.items.alignment.distance'),
    status: 'info' as const,
  },
]);
</script>

<template>
  <div class="dashboard-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">{{ t('dashboard.eyebrow') }}</p>
        <h1>{{ t('dashboard.title') }}</h1>
        <p>{{ t('dashboard.subtitle') }}</p>
      </div>
      <AppStatusBadge :label="t('dashboard.synced')" status="success" />
    </header>

    <section class="dashboard-grid" :aria-label="t('dashboard.summaryLabel')">
      <article class="vehicle-panel">
        <div class="panel-kicker">
          <CircleGauge :size="19" aria-hidden="true" />{{
            t('dashboard.odometer.label')
          }}
        </div>
        <strong class="odometer tabular">84.320 <small>km</small></strong>
        <p>{{ t('dashboard.odometer.updated') }}</p>
        <AppButton variant="secondary" block>{{
          t('dashboard.odometer.action')
        }}</AppButton>
        <dl>
          <div>
            <dt>{{ t('dashboard.vehicle.model') }}</dt>
            <dd>{{ t('shell.demoVehicles.civic') }}</dd>
          </div>
          <div>
            <dt>{{ t('dashboard.vehicle.year') }}</dt>
            <dd class="tabular">2019</dd>
          </div>
          <div>
            <dt>{{ t('dashboard.vehicle.plate') }}</dt>
            <dd class="tabular">BRA • 2E19</dd>
          </div>
        </dl>
      </article>

      <section
        id="agenda"
        class="timeline-panel"
        aria-labelledby="timeline-title"
      >
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('dashboard.timeline.eyebrow') }}</p>
            <h2 id="timeline-title">{{ t('dashboard.timeline.title') }}</h2>
          </div>
          <AppStatusBadge
            :label="t('dashboard.timeline.attention', 1)"
            status="danger"
          />
        </div>
        <ol class="maintenance-list">
          <li v-for="item in upcoming" :key="item.key">
            <span
              class="timeline-mark"
              :data-status="item.status"
              aria-hidden="true"
            />
            <div>
              <strong>{{ t(`dashboard.items.${item.key}.title`) }}</strong>
              <p>{{ t(`dashboard.items.${item.key}.description`) }}</p>
              <div class="maintenance-meta tabular">
                <span
                  ><CalendarDays :size="15" aria-hidden="true" />{{
                    item.date
                  }}</span
                ><span
                  ><Clock3 :size="15" aria-hidden="true" />{{
                    item.distance
                  }}</span
                >
              </div>
            </div>
            <AppStatusBadge
              :label="t(`dashboard.items.${item.key}.badge`)"
              :status="item.status"
            />
          </li>
        </ol>
      </section>

      <section id="costs" class="cost-panel" aria-labelledby="cost-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">{{ t('dashboard.cost.eyebrow') }}</p>
            <h2 id="cost-title">{{ t('dashboard.cost.title') }}</h2>
          </div>
          <ArrowUpRight :size="20" aria-hidden="true" />
        </div>
        <strong class="cost-value tabular">R$ 486,90</strong>
        <p>{{ t('dashboard.cost.comparison') }}</p>
        <div
          class="cost-bars"
          role="img"
          :aria-label="t('dashboard.cost.chartSummary')"
        >
          <span
            v-for="(height, month) in [28, 46, 20, 72, 38, 61]"
            :key="month"
            :style="{ height: `${height}%` }"
          />
        </div>
        <div class="cost-axis">
          <span>{{ t('dashboard.cost.axisStart') }}</span
          ><span>{{ t('dashboard.cost.axisEnd') }}</span>
        </div>
      </section>
    </section>

    <section class="recent-section" aria-labelledby="recent-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">{{ t('dashboard.recent.eyebrow') }}</p>
          <h2 id="recent-title">{{ t('dashboard.recent.title') }}</h2>
        </div>
        <AppButton variant="quiet">{{ t('actions.seeAll') }}</AppButton>
      </div>
      <div class="recent-row">
        <Wrench :size="19" aria-hidden="true" />
        <div>
          <strong>{{ t('dashboard.recent.item') }}</strong>
          <p>{{ t('dashboard.recent.detail') }}</p>
        </div>
        <time class="tabular" datetime="2026-08-08">08 ago</time>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: clamp(2rem, 4vw, 3.5rem);
}
.page-heading,
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.page-heading h1 {
  margin: 0.15rem 0 0.25rem;
  font-size: clamp(1.75rem, 4vw, 2.4rem);
  line-height: 1.1;
  letter-spacing: -0.035em;
}
.page-heading > div > p:last-child,
.vehicle-panel > p,
.cost-panel > p {
  margin: 0;
  color: var(--text-muted);
}
.eyebrow,
.panel-kicker {
  margin: 0;
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 780;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(14rem, 0.72fr) minmax(23rem, 1.5fr) minmax(
      14rem,
      0.85fr
    );
  border-block: 1px solid var(--border);
}
.vehicle-panel,
.timeline-panel,
.cost-panel {
  padding: clamp(1.25rem, 2.5vw, 2rem);
}
.vehicle-panel {
  border-right: 1px solid var(--border);
}
.panel-kicker {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-muted);
}
.odometer {
  display: block;
  margin: 1rem 0 0.15rem;
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1;
  letter-spacing: -0.04em;
}
.odometer small {
  color: var(--text-muted);
  font-size: 0.8rem;
  letter-spacing: 0;
}
.vehicle-panel > :deep(.ui-button) {
  margin-top: 1.5rem;
}
dl {
  display: grid;
  gap: 0.7rem;
  margin: 1.5rem 0 0;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}
dl div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
dt {
  color: var(--text-muted);
  font-size: 0.75rem;
}
dd {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 680;
}
.timeline-panel {
  border-right: 1px solid var(--border);
}
.section-heading h2 {
  margin: 0.15rem 0 0;
  font-size: 1.1rem;
  letter-spacing: -0.015em;
}
.maintenance-list {
  display: grid;
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
}
.maintenance-list li {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.85rem;
  padding: 1rem 0;
  border-top: 1px solid var(--border);
}
.maintenance-list strong {
  font-size: 0.9375rem;
}
.maintenance-list p {
  margin: 0.2rem 0 0.5rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}
.timeline-mark {
  width: 0.625rem;
  height: 0.625rem;
  margin-top: 0.4rem;
  background: var(--info);
  border: 2px solid var(--canvas);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--info);
}
.timeline-mark[data-status='danger'] {
  background: var(--danger);
  box-shadow: 0 0 0 1px var(--danger);
}
.timeline-mark[data-status='warning'] {
  background: var(--warning);
  box-shadow: 0 0 0 1px var(--warning);
}
.maintenance-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}
.maintenance-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.cost-value {
  display: block;
  margin-top: 1.5rem;
  font-size: 2rem;
  letter-spacing: -0.035em;
}
.cost-bars {
  height: 8rem;
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
  margin-top: 2rem;
  border-bottom: 1px solid var(--border-strong);
}
.cost-bars span {
  flex: 1;
  min-height: 0.25rem;
  background: var(--primary);
  opacity: 0.78;
}
.cost-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.65rem;
}
.recent-section {
  display: grid;
  gap: 0.75rem;
}
.recent-row {
  min-height: 4.5rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding-block: 0.75rem;
  border-block: 1px solid var(--border);
}
.recent-row p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
}
.recent-row time {
  color: var(--text-muted);
  font-size: 0.75rem;
}
@media (max-width: 78rem) {
  .dashboard-grid {
    grid-template-columns: minmax(14rem, 0.8fr) minmax(22rem, 1.4fr);
  }
  .cost-panel {
    grid-column: 1 / -1;
    border-top: 1px solid var(--border);
  }
  .cost-bars {
    height: 6rem;
  }
}
@media (max-width: 45rem) {
  .page-heading {
    align-items: flex-end;
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
    border: 0;
    gap: 1.5rem;
  }
  .vehicle-panel,
  .timeline-panel,
  .cost-panel {
    padding: 1.25rem 0;
    border: 0;
    border-top: 1px solid var(--border);
  }
  .maintenance-list li {
    grid-template-columns: auto 1fr;
  }
  .maintenance-list li > :deep(.status-badge) {
    grid-column: 2;
  }
}
</style>
