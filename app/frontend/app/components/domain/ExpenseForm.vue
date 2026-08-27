<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  MaintenanceRecord,
} from '~/types/api';
import { localDateTimeToIso, toLocalDateTimeInput } from '~/utils/date-time';
import { decimalToMinorUnits, formatDecimalCurrency } from '~/utils/formatters';

interface ExpenseItemForm {
  category: ExpenseCategory;
  description: string;
  amount: string;
}

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
const items = ref<ExpenseItemForm[]>([
  { category: 'PARTS', description: '', amount: '' },
]);
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

const totalAmount = computed(() => {
  const total = items.value.reduce((sum, item) => {
    const minor = decimalToMinorUnits(normalizeAmount(item.amount));
    return minor === undefined ? sum : sum + minor;
  }, 0n);
  return minorUnitsToDecimal(total);
});

const formattedTotal = computed(() =>
  formatDecimalCurrency(totalAmount.value, locale.value),
);

watch(
  () => props.expense,
  (expense) => {
    category.value = expense?.category ?? 'PARTS';
    description.value = expense?.description ?? '';
    incurredAt.value = expense
      ? toLocalDateTimeInput(new Date(expense.incurredAt))
      : toLocalDateTimeInput(new Date());
    items.value = expense?.items?.length
      ? expense.items.map((item) => ({
          category: item.category,
          description: item.description,
          amount: item.amount,
        }))
      : [
          {
            category: expense?.category ?? 'PARTS',
            description: expense?.description ?? '',
            amount: expense?.amount ?? '',
          },
        ];
    notes.value = expense?.notes ?? '';
    maintenanceRecordId.value = expense?.maintenanceRecordId ?? '';
    error.value = '';
  },
  { immediate: true },
);

function normalizeAmount(value: string): string {
  return value.trim().replace(',', '.');
}

function minorUnitsToDecimal(value: bigint): string {
  const cents = value % 100n;
  const reais = value / 100n;
  return `${reais}.${cents.toString().padStart(2, '0')}`;
}

function addItem(defaults?: Partial<ExpenseItemForm>): void {
  items.value.push({
    category: defaults?.category ?? 'PARTS',
    description: defaults?.description ?? '',
    amount: defaults?.amount ?? '',
  });
}

function addLaborItem(): void {
  addItem({ category: 'LABOR', description: t('expenses.form.laborItem') });
}

function removeItem(index: number): void {
  if (items.value.length === 1) return;
  items.value.splice(index, 1);
}

function submit(): void {
  const occurred = localDateTimeToIso(incurredAt.value);
  const normalizedItems = items.value.map((item) => ({
    category: item.category,
    description: item.description.trim(),
    amount: normalizeAmount(item.amount),
  }));
  const everyItemIsValid =
    normalizedItems.length > 0 &&
    normalizedItems.every(
      (item) =>
        item.description &&
        item.description.length <= 500 &&
        /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(item.amount),
    );
  if (
    !description.value.trim() ||
    description.value.trim().length > 500 ||
    !occurred ||
    !everyItemIsValid ||
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
    amount: totalAmount.value,
    items: normalizedItems,
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
      <AppSelect
        id="expense-record"
        v-model="maintenanceRecordId"
        :label="t('expenses.form.record')"
        :options="recordOptions"
        :hint="t('expenses.form.recordHint')"
        :disabled="disabled"
      />
    </div>
    <section class="expense-items" :aria-label="t('expenses.form.items')">
      <div class="items-header">
        <div>
          <h2>{{ t('expenses.form.items') }}</h2>
          <p>{{ t('expenses.form.itemsHint') }}</p>
        </div>
        <strong class="tabular">{{ formattedTotal }}</strong>
      </div>
      <div v-for="(item, index) in items" :key="index" class="expense-item-row">
        <AppSelect
          :id="`expense-item-category-${index}`"
          v-model="item.category"
          :label="t('expenses.form.itemCategory')"
          :options="categoryOptions"
          :disabled="disabled"
        />
        <AppInput
          :id="`expense-item-description-${index}`"
          v-model="item.description"
          :label="t('expenses.form.itemDescription')"
          :disabled="disabled"
        />
        <AppInput
          :id="`expense-item-amount-${index}`"
          v-model="item.amount"
          inputmode="decimal"
          :label="t('expenses.form.itemAmount')"
          :disabled="disabled"
        />
        <AppButton
          type="button"
          variant="quiet"
          :disabled="disabled || items.length === 1"
          @click="removeItem(index)"
          >{{ t('expenses.form.removeItem') }}</AppButton
        >
      </div>
      <div class="item-actions">
        <AppButton
          type="button"
          variant="secondary"
          :disabled="disabled"
          @click="addItem()"
        >
          {{ t('expenses.form.addItem') }}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          :disabled="disabled"
          @click="addLaborItem"
        >
          {{ t('expenses.form.addLabor') }}
        </AppButton>
      </div>
    </section>
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
.expense-items {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-muted);
}
.items-header,
.item-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}
.items-header h2 {
  margin: 0;
  font-size: 1rem;
}
.items-header p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
}
.expense-item-row {
  display: grid;
  grid-template-columns:
    minmax(9rem, 0.8fr) minmax(12rem, 1.5fr) minmax(8rem, 0.8fr)
    auto;
  gap: 0.75rem;
  align-items: end;
}
@media (max-width: 38rem) {
  .form-grid,
  .expense-item-row,
  .items-header,
  .item-actions {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .items-header,
  .item-actions {
    display: grid;
  }
}
</style>
