<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  deleteExpense,
  expenseKeys,
  listExpenses,
  pageAfterDeletingItem,
  reportKeys,
} from '~/services/api/expenses';
import type { ExpenseCategory } from '~/types/api';
import { localDateTimeToIso } from '~/utils/date-time';
import { formatDecimalCurrency } from '~/utils/formatters';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t, locale } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const page = ref(1);
const category = ref('');
const from = ref('');
const to = ref('');
const deleteError = ref('');
const filters = computed(() => ({
  page: page.value,
  limit: 20,
  ...(category.value ? { category: category.value as ExpenseCategory } : {}),
  ...(from.value ? { incurredFrom: localDateTimeToIso(from.value) } : {}),
  ...(to.value ? { incurredTo: localDateTimeToIso(to.value) } : {}),
}));
const query = useQuery({
  queryKey: computed(() => expenseKeys.list(id.value, filters.value)),
  queryFn: () => listExpenses(id.value, filters.value),
});
const categoryOptions = computed(() => [
  { value: '', label: t('expenses.filters.allCategories') },
  ...(
    ['LABOR', 'PARTS', 'DIAGNOSTICS', 'TOWING', 'OTHER'] as ExpenseCategory[]
  ).map((value) => ({ value, label: t(`expenses.categories.${value}`) })),
]);
watch([category, from, to], () => (page.value = 1));
const remove = useMutation({
  mutationFn: (expenseId: string) => deleteExpense(id.value, expenseId),
  onSuccess: async () => {
    page.value = pageAfterDeletingItem(
      page.value,
      query.data.value?.data.length ?? 0,
    );
    await Promise.all([
      client.invalidateQueries({ queryKey: expenseKeys.vehicle(id.value) }),
      client.invalidateQueries({ queryKey: reportKeys.vehicle(id.value) }),
    ]);
  },
});
function confirmDelete(expenseId: string): void {
  if (!isOnline.value || !window.confirm(t('expenses.delete.confirm'))) return;
  deleteError.value = '';
  remove.mutate(expenseId, {
    onError: (error) => {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      deleteError.value = t(
        status === 409 ? 'expenses.delete.conflict' : 'expenses.delete.error',
      );
    },
  });
}
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(value),
  );
useHead({ title: computed(() => t('expenses.list.metaTitle')) });
</script>

<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('expenses.list.eyebrow') }}</p>
        <h1>{{ t('expenses.list.title') }}</h1>
        <p>{{ t('expenses.list.description') }}</p>
      </div>
      <NuxtLink class="button-link" :to="`/vehicles/${id}/expenses/new`">{{
        t('expenses.list.create')
      }}</NuxtLink>
    </header>
    <nav class="vehicle-tabs" :aria-label="t('maintenance.vehicleNavigation')">
      <NuxtLink :to="`/vehicles/${id}`">{{
        t('maintenance.links.vehicle')
      }}</NuxtLink>
      <NuxtLink :to="`/vehicles/${id}/history`">{{
        t('maintenance.links.history')
      }}</NuxtLink>
      <NuxtLink to="/reports">{{ t('navigation.reports') }}</NuxtLink>
    </nav>
    <div class="expense-filters">
      <AppSelect
        id="expense-filter-category"
        v-model="category"
        compact
        :label="t('expenses.filters.category')"
        :options="categoryOptions"
      />
      <div class="ui-native-field">
        <label for="expense-from">{{ t('expenses.filters.from') }}</label
        ><input id="expense-from" v-model="from" type="datetime-local" />
      </div>
      <div class="ui-native-field">
        <label for="expense-to">{{ t('expenses.filters.to') }}</label
        ><input id="expense-to" v-model="to" type="datetime-local" />
      </div>
    </div>
    <AppSkeleton v-if="query.isPending.value" />
    <AppErrorState
      v-else-if="query.isError.value"
      :title="t('expenses.list.errorTitle')"
      :description="t('expenses.list.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <AppEmptyState
      v-else-if="!query.data.value?.data.length"
      :title="t('expenses.list.emptyTitle')"
      :description="t('expenses.list.emptyDescription')"
      ><NuxtLink class="button-link" :to="`/vehicles/${id}/expenses/new`">{{
        t('expenses.list.create')
      }}</NuxtLink></AppEmptyState
    >
    <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
    <ol
      v-if="query.data.value?.data.length"
      class="expense-list"
      :aria-label="t('expenses.list.label')"
    >
      <li v-for="expense in query.data.value.data" :key="expense.id">
        <NuxtLink :to="`/vehicles/${id}/expenses/${expense.id}`">
          <div>
            <time :datetime="expense.incurredAt">{{
              formatDate(expense.incurredAt)
            }}</time>
            <h2>{{ expense.description }}</h2>
            <p>
              {{ t(`expenses.categories.${expense.category}`)
              }}<span v-if="expense.maintenanceRecordId">
                · {{ t('expenses.list.linked') }}</span
              ><span v-if="expense.items.length > 1">
                · {{ t('expenses.list.itemCount', expense.items.length) }}</span
              >
            </p>
          </div>
          <strong class="tabular">{{
            formatDecimalCurrency(expense.amount, locale)
          }}</strong>
        </NuxtLink>
        <AppButton
          variant="quiet"
          :disabled="!isOnline"
          :loading="remove.isPending.value"
          @click="confirmDelete(expense.id)"
          >{{ t('actions.delete') }}</AppButton
        >
      </li>
    </ol>
    <nav
      v-if="(query.data.value?.meta.totalPages ?? 0) > 1"
      class="pagination"
      :aria-label="t('expenses.list.pagination')"
    >
      <AppButton variant="secondary" :disabled="page <= 1" @click="page--">{{
        t('actions.previous')
      }}</AppButton
      ><span>{{
        t('expenses.list.page', {
          page,
          total: query.data.value?.meta.totalPages,
        })
      }}</span
      ><AppButton
        variant="secondary"
        :disabled="page >= (query.data.value?.meta.totalPages ?? 1)"
        @click="page++"
        >{{ t('actions.next') }}</AppButton
      >
    </nav>
  </div>
</template>

<style scoped>
.vehicle-tabs,
.expense-filters {
  display: flex;
  gap: 1rem;
}
.vehicle-tabs {
  border-bottom: 1px solid var(--border);
}
.vehicle-tabs a {
  padding: 0.6rem 0;
  color: var(--primary);
  font-weight: 680;
}
.expense-filters {
  align-items: end;
}
.expense-filters > * {
  flex: 1;
}
.expense-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--border);
}
.expense-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  border-bottom: 1px solid var(--border);
}
.expense-list a {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  color: var(--text);
  text-decoration: none;
}
.expense-list h2,
.expense-list p {
  margin: 0.2rem 0;
}
.expense-list time,
.expense-list p {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
@media (max-width: 42rem) {
  .expense-filters {
    display: grid;
  }
  .expense-list li {
    grid-template-columns: 1fr;
  }
  .expense-list a {
    flex-direction: column;
  }
  .expense-list button {
    justify-self: end;
  }
}
</style>
