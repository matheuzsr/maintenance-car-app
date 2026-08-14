<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  MaintenanceRecord,
} from '~/types/api';
import { localDateTimeToIso, toLocalDateTimeInput } from '~/utils/date-time';

const props = withDefaults(
  defineProps<{
    mode?: 'create' | 'edit';
    expense?: Expense;
    records?: MaintenanceRecord[];
    submitting?: boolean;
    disabled?: boolean;
    submitLabel: string;
    serverError?: string;
  }>(),
  {
    mode: 'create',
    expense: undefined,
    records: () => [],
    submitting: false,
    disabled: false,
    serverError: undefined,
  },
);
const emit = defineEmits<{ submit: [value: CreateExpenseInput] }>();
const { t, locale } = useI18n();
const categories: ExpenseCategory[] = [
  'LABOR',
  'PARTS',
  'DIAGNOSTICS',
  'TOWING',
  'OTHER',
];
const category = ref<ExpenseCategory>('PARTS');
const description = ref('');
const incurredAt = ref(toLocalDateTimeInput(new Date()));
const amount = ref('');
const notes = ref('');
const maintenanceRecordId = ref('');
const error = ref('');
const categoryOptions = computed(() =>
  categories.map((value) => ({
    value,
    label: t(`expenses.categories.${value}`),
  })),
);
const recordOptions = computed(() => [
  { value: '', label: t('expenses.form.noRecord') },
  ...props.records.map((record) => ({
    value: record.id,
    label: `${new Intl.DateTimeFormat(locale.value, { dateStyle: 'short' }).format(new Date(record.performedAt))} · ${record.description}`,
  })),
]);

watch(
  () => props.expense,
  (expense) => {
    category.value = expense?.category ?? 'PARTS';
    description.value = expense?.description ?? '';
    incurredAt.value = expense
      ? toLocalDateTimeInput(new Date(expense.incurredAt))
      : toLocalDateTimeInput(new Date());
    amount.value = expense?.amount ?? '';
    notes.value = expense?.notes ?? '';
    maintenanceRecordId.value = expense?.maintenanceRecordId ?? '';
    error.value = '';
  },
  { immediate: true },
);

function submit(): void {
  const occurred = localDateTimeToIso(incurredAt.value);
  const normalizedAmount = amount.value.trim().replace(',', '.');
  if (
    !description.value.trim() ||
    description.value.trim().length > 500 ||
    !occurred ||
    !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalizedAmount) ||
    notes.value.trim().length > 2000
  ) {
    error.value = t('expenses.form.validation');
    return;
  }
  error.value = '';
  emit('submit', {
    category: category.value,
    description: description.value.trim(),
    incurredAt: occurred,
    amount: normalizedAmount,
    ...(notes.value.trim()
      ? { notes: notes.value.trim() }
      : props.mode === 'edit'
        ? { notes: null }
        : {}),
    maintenanceRecordId: maintenanceRecordId.value || null,
  });
}
</script>

<template>
  <form class="entity-form" novalidate @submit.prevent="submit">
    <div class="form-grid">
      <AppSelect
        id="expense-category"
        v-model="category"
        :label="t('expenses.form.category')"
        :options="categoryOptions"
        :disabled="disabled"
      />
      <AppInput
        id="expense-description"
        v-model="description"
        :label="t('expenses.form.description')"
        :disabled="disabled"
      />
      <div class="ui-native-field">
        <label for="expense-incurred-at">{{
          t('expenses.form.incurredAt')
        }}</label>
        <input
          id="expense-incurred-at"
          v-model="incurredAt"
          type="datetime-local"
          :disabled="disabled"
        />
      </div>
      <AppInput
        id="expense-amount"
        v-model="amount"
        inputmode="decimal"
        :label="t('expenses.form.amount')"
        :disabled="disabled"
      />
      <AppSelect
        id="expense-record"
        v-model="maintenanceRecordId"
        :label="t('expenses.form.record')"
        :options="recordOptions"
        :hint="t('expenses.form.recordHint')"
        :disabled="disabled"
      />
    </div>
    <div class="ui-native-field">
      <label for="expense-notes">{{ t('expenses.form.notes') }}</label>
      <textarea
        id="expense-notes"
        v-model="notes"
        rows="4"
        maxlength="2000"
        :disabled="disabled"
      />
    </div>
    <p v-if="error || serverError" class="form-error" role="alert">
      {{ error || serverError }}
    </p>
    <div class="form-actions">
      <AppButton type="submit" :loading="submitting" :disabled="disabled">
        {{ submitLabel }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped>
textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  resize: vertical;
}
@media (max-width: 38rem) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
