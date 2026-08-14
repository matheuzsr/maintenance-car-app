<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  expenseKeys,
  getExpense,
  reportKeys,
  updateExpense,
} from '~/services/api/expenses';
import {
  listMaintenanceRecords,
  maintenanceKeys,
} from '~/services/api/maintenance';
import type { CreateExpenseInput } from '~/types/api';
definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const expenseId = computed(() => String(route.params.expenseId));
const serverError = ref('');
const expense = useQuery({
  queryKey: computed(() => expenseKeys.detail(id.value, expenseId.value)),
  queryFn: () => getExpense(id.value, expenseId.value),
});
const records = useQuery({
  queryKey: computed(() =>
    maintenanceKeys.records(id.value, { page: 1, limit: 100 }),
  ),
  queryFn: () => listMaintenanceRecords(id.value, { page: 1, limit: 100 }),
});
const mutation = useMutation({
  mutationFn: (body: CreateExpenseInput) =>
    updateExpense(id.value, expenseId.value, body),
  onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: expenseKeys.vehicle(id.value) }),
      client.invalidateQueries({ queryKey: reportKeys.vehicle(id.value) }),
    ]);
    await navigateTo(`/vehicles/${id.value}/expenses/${expenseId.value}`);
  },
});
function submit(body: CreateExpenseInput) {
  serverError.value = '';
  mutation.mutate(body, {
    onError: () => (serverError.value = t('expenses.form.saveError')),
  });
}
useHead({ title: computed(() => t('expenses.edit.metaTitle')) });
</script>
<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('expenses.edit.eyebrow') }}</p>
        <h1>{{ t('expenses.edit.title') }}</h1>
        <p>{{ t('expenses.edit.description') }}</p>
      </div>
    </header>
    <AppErrorState
      v-if="expense.isError.value || records.isError.value"
      :title="t('expenses.form.loadErrorTitle')"
      :description="t('expenses.form.loadErrorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="
        () => {
          expense.refetch();
          records.refetch();
        }
      "
    /><AppSkeleton
      v-else-if="expense.isPending.value || records.isPending.value"
    /><ExpenseForm
      v-else-if="expense.data.value"
      mode="edit"
      :expense="expense.data.value"
      :records="records.data.value?.data"
      :submit-label="t('actions.save')"
      :submitting="mutation.isPending.value"
      :disabled="!isOnline"
      :server-error="serverError"
      @submit="submit"
    />
  </div>
</template>
