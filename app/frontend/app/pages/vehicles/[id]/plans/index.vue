<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  deleteMaintenancePlan,
  listMaintenancePlans,
  maintenanceKeys,
} from '~/services/api/maintenance';
import type { MaintenanceCategory } from '~/types/api';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t, n } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const category = ref('');
const activity = ref('active');
const page = ref(1);
const limit = 20;
const filters = computed(() => ({
  page: page.value,
  limit,
  ...(category.value
    ? { category: category.value as MaintenanceCategory }
    : {}),
  ...(activity.value === 'all' ? {} : { active: activity.value === 'active' }),
}));
const query = useQuery({
  queryKey: computed(() => maintenanceKeys.plans(id.value, filters.value)),
  queryFn: () => listMaintenancePlans(id.value, filters.value),
});
const plans = computed(() => query.data.value?.data ?? []);
watch([category, activity], () => {
  page.value = 1;
});
const categoryOptions = computed(() => [
  { label: t('maintenance.filters.allCategories'), value: '' },
  ...(
    [
      'ENGINE',
      'FILTERS',
      'BRAKES',
      'TRANSMISSION',
      'SUSPENSION',
      'TIRES',
      'ELECTRICAL',
      'COOLING',
      'OTHER',
    ] as MaintenanceCategory[]
  ).map((value) => ({ label: t(`maintenance.categories.${value}`), value })),
]);
const activityOptions = computed(() => [
  { label: t('maintenance.filters.active'), value: 'active' },
  { label: t('maintenance.filters.inactive'), value: 'inactive' },
  { label: t('maintenance.filters.all'), value: 'all' },
]);
const remove = useMutation({
  mutationFn: (planId: string) => deleteMaintenancePlan(id.value, planId),
  onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: maintenanceKeys.plans(id.value) }),
      client.invalidateQueries({
        queryKey: maintenanceKeys.agendaBase(id.value),
      }),
    ]);
  },
});
const deleteError = ref('');
function confirmDelete(planId: string): void {
  if (!isOnline.value) return;
  deleteError.value = '';
  if (window.confirm(t('maintenance.plans.deleteConfirm')))
    remove.mutate(planId, {
      onError: () => {
        deleteError.value = t('maintenance.plans.deleteError');
      },
    });
}
useHead({ title: computed(() => t('maintenance.plans.metaTitle')) });
</script>

<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.plans.eyebrow') }}</p>
        <h1>{{ t('maintenance.plans.title') }}</h1>
        <p>{{ t('maintenance.plans.description') }}</p>
      </div>
      <NuxtLink class="button-link" :to="`/vehicles/${id}/plans/new`">{{
        t('maintenance.plans.create')
      }}</NuxtLink>
    </header>
    <nav class="plan-links">
      <NuxtLink :to="`/vehicles/${id}/agenda`">{{
        t('maintenance.links.agenda')
      }}</NuxtLink
      ><NuxtLink :to="`/vehicles/${id}/history`">{{
        t('maintenance.links.history')
      }}</NuxtLink
      ><NuxtLink :to="`/vehicles/${id}`">{{
        t('maintenance.links.vehicle')
      }}</NuxtLink>
    </nav>
    <div class="plan-filters">
      <AppSelect
        id="plan-filter-category"
        v-model="category"
        compact
        :label="t('maintenance.filters.category')"
        :options="categoryOptions"
      /><AppSelect
        id="plan-filter-active"
        v-model="activity"
        compact
        :label="t('maintenance.filters.activity')"
        :options="activityOptions"
      />
    </div>
    <AppSkeleton v-if="query.isPending.value" /><AppErrorState
      v-else-if="query.isError.value"
      :title="t('maintenance.plans.errorTitle')"
      :description="t('maintenance.plans.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <AppEmptyState
      v-else-if="!plans.length"
      :title="t('maintenance.plans.emptyTitle')"
      :description="t('maintenance.plans.emptyDescription')"
      ><NuxtLink class="button-link" :to="`/vehicles/${id}/plans/new`">{{
        t('maintenance.plans.create')
      }}</NuxtLink></AppEmptyState
    >
    <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
    <ul v-else class="plan-list">
      <li v-for="plan in plans" :key="plan.id">
        <div>
          <span>{{ t(`maintenance.categories.${plan.category}`) }}</span>
          <h2>{{ plan.name }}</h2>
          <p>
            {{
              t('maintenance.interval.summary', {
                months: Number(plan.intervalMonths) || '—',
                km: Number(plan.intervalKm) ? n(Number(plan.intervalKm)) : '—',
              })
            }}
          </p>
        </div>
        <AppStatusBadge
          :label="
            t(
              plan.active
                ? 'maintenance.plans.active'
                : 'maintenance.plans.inactive',
            )
          "
          :status="plan.active ? 'success' : 'neutral'"
        />
        <div class="row-actions">
          <NuxtLink
            v-if="plan.active"
            class="text-link"
            :to="`/vehicles/${id}/plans/${plan.id}/complete`"
            >{{ t('maintenance.records.complete.shortAction') }}</NuxtLink
          >
          <NuxtLink
            class="text-link"
            :to="`/vehicles/${id}/plans/${plan.id}/edit`"
            >{{ t('actions.edit') }}</NuxtLink
          ><AppButton
            variant="quiet"
            :loading="remove.isPending.value"
            :disabled="!isOnline"
            @click="confirmDelete(plan.id)"
            >{{ t('actions.delete') }}</AppButton
          >
        </div>
      </li>
    </ul>
    <nav
      v-if="
        query.data.value?.meta.totalPages &&
        query.data.value.meta.totalPages > 1
      "
      class="pagination"
      :aria-label="t('maintenance.plans.pagination')"
    >
      <AppButton variant="secondary" :disabled="page <= 1" @click="page--">{{
        t('actions.previous')
      }}</AppButton>
      <span>{{
        t('maintenance.plans.page', {
          page,
          total: query.data.value.meta.totalPages,
        })
      }}</span>
      <AppButton
        variant="secondary"
        :disabled="page >= query.data.value.meta.totalPages"
        @click="page++"
        >{{ t('actions.next') }}</AppButton
      >
    </nav>
  </div>
</template>

<style scoped>
.plan-links {
  display: flex;
  gap: 1rem;
}
.plan-links a {
  color: var(--primary);
  font-weight: 680;
}
.plan-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 15rem));
  gap: 1rem;
}
.plan-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--border);
}
.plan-list li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border);
}
.plan-list h2,
.plan-list p {
  margin: 0.15rem 0;
}
.plan-list span,
.plan-list p {
  color: var(--text-muted);
  font-size: 0.82rem;
}
.row-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
@media (max-width: 42rem) {
  .plan-filters {
    grid-template-columns: 1fr;
  }
  .plan-list li {
    grid-template-columns: 1fr auto;
  }
  .row-actions {
    grid-column: 1/-1;
    justify-content: flex-end;
  }
}
</style>
