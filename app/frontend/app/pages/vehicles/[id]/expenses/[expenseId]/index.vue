<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  deleteExpense,
  expenseKeys,
  getExpense,
  reportKeys,
} from '~/services/api/expenses';
import { formatDecimalCurrency } from '~/utils/formatters';
definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t, d, locale } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const expenseId = computed(() => String(route.params.expenseId));
const error = ref('');
const query = useQuery({
  queryKey: computed(() => expenseKeys.detail(id.value, expenseId.value)),
  queryFn: () => getExpense(id.value, expenseId.value),
});
const remove = useMutation({
  mutationFn: () => deleteExpense(id.value, expenseId.value),
  onSuccess: async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: expenseKeys.vehicle(id.value) }),
      client.invalidateQueries({ queryKey: reportKeys.vehicle(id.value) }),
    ]);
    await navigateTo(`/vehicles/${id.value}/expenses`);
  },
});
function confirmDelete() {
  if (!isOnline.value || !window.confirm(t('expenses.delete.confirm'))) return;
  remove.mutate(undefined, {
    onError: (failure) => {
      const status = (failure as { response?: { status?: number } }).response
        ?.status;
      error.value = t(
        status === 409 ? 'expenses.delete.conflict' : 'expenses.delete.error',
      );
    },
  });
}
useHead({ title: computed(() => t('expenses.detail.metaTitle')) });
</script>
<template>
  <div class="entity-page">
    <AppSkeleton v-if="query.isPending.value" /><AppErrorState
      v-else-if="query.isError.value"
      :title="t('expenses.detail.errorTitle')"
      :description="t('expenses.detail.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    /><template v-else-if="query.data.value"
      ><header class="entity-heading">
        <div>
          <p class="eyebrow">
            {{ t(`expenses.categories.${query.data.value.category}`) }}
          </p>
          <h1>{{ query.data.value.description }}</h1>
          <p>{{ d(new Date(query.data.value.incurredAt), 'long') }}</p>
        </div>
        <strong class="expense-total">{{
          formatDecimalCurrency(query.data.value.amount, locale)
        }}</strong>
      </header>
      <dl class="detail-list">
        <div>
          <dt>{{ t('expenses.detail.link') }}</dt>
          <dd>
            <NuxtLink
              v-if="query.data.value.maintenanceRecordId"
              :to="`/vehicles/${id}/history/${query.data.value.maintenanceRecordId}`"
              >{{ t('expenses.detail.openRecord') }}</NuxtLink
            ><span v-else>{{ t('expenses.detail.standalone') }}</span>
          </dd>
        </div>
        <div v-if="query.data.value.notes">
          <dt>{{ t('expenses.form.notes') }}</dt>
          <dd>{{ query.data.value.notes }}</dd>
        </div>
      </dl>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="row-actions">
        <NuxtLink
          class="button-link"
          :to="`/vehicles/${id}/expenses/${expenseId}/edit`"
          >{{ t('actions.edit') }}</NuxtLink
        ><AppButton
          variant="quiet"
          :disabled="!isOnline"
          :loading="remove.isPending.value"
          @click="confirmDelete"
          >{{ t('actions.delete') }}</AppButton
        >
      </div></template
    >
  </div>
</template>
<style scoped>
.expense-total {
  font-size: clamp(1.5rem, 4vw, 2.4rem);
  font-variant-numeric: tabular-nums;
}
.detail-list {
  display: grid;
  gap: 1rem;
}
.detail-list div {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}
dt {
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
}
dd {
  margin: 0.3rem 0;
  white-space: pre-wrap;
}
.row-actions {
  display: flex;
  gap: 0.75rem;
}
</style>
