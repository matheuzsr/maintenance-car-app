<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  deleteMaintenanceRecord,
  getMaintenanceRecord,
  maintenanceKeys,
} from '~/services/api/maintenance';
import { formatDecimalCurrency } from '~/utils/formatters';
import {
  maintenanceRecordDeleteErrorKey,
  maintenanceRecordInvalidationKeys,
} from '~/utils/maintenance-records';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t, n, locale } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const recordId = computed(() => String(route.params.recordId));
const query = useQuery({
  queryKey: computed(() => maintenanceKeys.record(id.value, recordId.value)),
  queryFn: () => getMaintenanceRecord(id.value, recordId.value),
});
const deleteError = ref('');
const remove = useMutation({
  mutationFn: () => deleteMaintenanceRecord(id.value, recordId.value),
  onSuccess: async () => {
    await Promise.all(
      maintenanceRecordInvalidationKeys(id.value).map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
    await navigateTo(`/vehicles/${id.value}/history`);
  },
  onError: (error: unknown) => {
    deleteError.value = t(maintenanceRecordDeleteErrorKey(error));
  },
});
function confirmDelete(): void {
  if (!isOnline.value) return;
  deleteError.value = '';
  if (window.confirm(t('maintenance.records.detail.deleteConfirm')))
    remove.mutate();
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
const formatMoney = (value: string) =>
  formatDecimalCurrency(value, locale.value);
useHead({
  title: computed(() =>
    query.data.value
      ? `${query.data.value.description} · ${t('app.name')}`
      : t('maintenance.records.detail.metaTitle'),
  ),
});
</script>

<template>
  <div class="entity-page narrow">
    <AppSkeleton v-if="query.isPending.value" />
    <AppErrorState
      v-else-if="query.isError.value || !query.data.value"
      :title="t('maintenance.records.detail.errorTitle')"
      :description="t('maintenance.records.detail.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <template v-else>
      <header class="entity-heading">
        <div>
          <p class="eyebrow">{{ t('maintenance.records.detail.eyebrow') }}</p>
          <h1>{{ query.data.value.description }}</h1>
          <p>
            <time :datetime="query.data.value.performedAt">{{
              formatDate(query.data.value.performedAt)
            }}</time>
          </p>
        </div>
        <NuxtLink
          class="button-link secondary"
          :to="`/vehicles/${id}/history/${recordId}/edit`"
          >{{ t('actions.edit') }}</NuxtLink
        >
      </header>
      <dl class="record-details">
        <div>
          <dt>{{ t('maintenance.records.form.odometer') }}</dt>
          <dd class="tabular">{{ n(query.data.value.odometerKm) }} km</dd>
        </div>
        <div>
          <dt>{{ t('maintenance.records.form.cost') }}</dt>
          <dd class="tabular">{{ formatMoney(query.data.value.totalCost) }}</dd>
        </div>
        <div>
          <dt>{{ t('maintenance.records.form.workshop') }}</dt>
          <dd>{{ query.data.value.workshop || '—' }}</dd>
        </div>
        <div>
          <dt>{{ t('maintenance.records.detail.plan') }}</dt>
          <dd>
            <NuxtLink
              v-if="query.data.value.planId"
              class="text-link"
              :to="`/vehicles/${id}/plans/${query.data.value.planId}/edit`"
              >{{ t('maintenance.records.detail.linkedPlan') }}</NuxtLink
            ><span v-else>—</span>
          </dd>
        </div>
      </dl>
      <section v-if="query.data.value.notes" class="record-notes">
        <h2>{{ t('maintenance.records.form.notes') }}</h2>
        <p>{{ query.data.value.notes }}</p>
      </section>
      <section
        v-if="query.data.value.costItems.length"
        class="record-cost-items"
      >
        <h2>{{ t('maintenance.records.detail.costItems') }}</h2>
        <ol>
          <li v-for="item in query.data.value.costItems" :key="item.id">
            <div>
              <span>{{ t(`expenses.categories.${item.category}`) }}</span>
              <strong>{{ item.description }}</strong>
            </div>
            <span class="tabular">{{ formatMoney(item.amount) }}</span>
          </li>
        </ol>
      </section>
      <nav class="detail-links">
        <NuxtLink class="text-link" :to="`/vehicles/${id}/history`">{{
          t('maintenance.records.detail.back')
        }}</NuxtLink>
      </nav>
      <section class="danger-zone">
        <h2>{{ t('maintenance.records.detail.deleteTitle') }}</h2>
        <p>{{ t('maintenance.records.detail.deleteDescription') }}</p>
        <p v-if="deleteError" class="form-error" role="alert">
          {{ deleteError }}
        </p>
        <AppButton
          variant="danger"
          :loading="remove.isPending.value"
          :disabled="!isOnline"
          @click="confirmDelete"
          >{{ t('actions.delete') }}</AppButton
        >
      </section>
    </template>
  </div>
</template>

<style scoped>
.record-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  border: 1px solid var(--border);
}
.record-details div {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}
.record-details dt {
  color: var(--text-muted);
  font-size: 0.82rem;
}
.record-details dd {
  margin: 0.25rem 0 0;
  font-weight: 680;
}
.record-notes {
  padding: 1rem;
  background: var(--surface-muted);
}
.record-notes h2,
.record-notes p {
  margin: 0.2rem 0;
}
.record-cost-items {
  display: grid;
  gap: 0.75rem;
}
.record-cost-items h2 {
  margin: 0;
  font-size: 1rem;
}
.record-cost-items ol {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}
.record-cost-items li {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
}
.record-cost-items li div {
  display: grid;
  gap: 0.2rem;
}
.record-cost-items span {
  color: var(--text-muted);
}
@media (max-width: 38rem) {
  .record-details {
    grid-template-columns: 1fr;
  }
}
</style>
