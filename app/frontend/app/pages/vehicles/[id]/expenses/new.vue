<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  createExpense,
  expenseKeys,
  reportKeys,
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
const serverError = ref('');
const records = useQuery({
  queryKey: computed(() =>
    maintenanceKeys.records(id.value, { page: 1, limit: 100 }),
  ),
  queryFn: () => listMaintenanceRecords(id.value, { page: 1, limit: 100 }),
});
const mutation = useMutation({
  mutationFn: (body: CreateExpenseInput) => createExpense(id.value, body),
  onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: expenseKeys.vehicle(id.value) }),
      client.invalidateQueries({ queryKey: reportKeys.vehicle(id.value) }),
    ]);
    await navigateTo(`/vehicles/${id.value}/expenses`);
  },
});
function submit(body: CreateExpenseInput) {
  serverError.value = '';
  mutation.mutate(body, {
    onError: () => (serverError.value = t('expenses.form.saveError')),
  });
}
useHead({ title: computed(() => t('expenses.create.metaTitle')) });
</script>
<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('expenses.create.eyebrow') }}</p>
        <h1>{{ t('expenses.create.title') }}</h1>
        <p>{{ t('expenses.create.description') }}</p>
      </div>
    </header>
    <AppErrorState
      v-if="records.isError.value"
      :title="t('expenses.form.loadErrorTitle')"
      :description="t('expenses.form.loadErrorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="records.refetch()"
    /><AppSkeleton v-else-if="records.isPending.value" /><ExpenseForm
      v-else
      :records="records.data.value?.data"
      :submit-label="t('expenses.create.action')"
      :submitting="mutation.isPending.value"
      :disabled="!isOnline"
      :server-error="serverError"
      @submit="submit"
    />
  </div>
</template>
