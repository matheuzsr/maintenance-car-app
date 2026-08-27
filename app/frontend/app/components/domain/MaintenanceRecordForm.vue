<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  ExpenseCategory,
  MaintenancePlan,
  MaintenanceRecord,
  Vehicle,
} from '~/types/api';
import { localDateTimeToIso, toLocalDateTimeInput } from '~/utils/date-time';
import { decimalToMinorUnits, formatDecimalCurrency } from '~/utils/formatters';

interface MaintenanceCostItemDraft {
  category: ExpenseCategory;
  description: string;
  amount: string;
}

export interface MaintenanceRecordDraft {
  description: string;
  performedAt: string;
  odometerKm: number;
  workshop?: string;
  notes?: string;
  totalCost: string;
  costItems?: MaintenanceCostItemDraft[];
  planId?: string;
}

const props = withDefaults(
  defineProps<{
    mode: 'standalone' | 'complete' | 'edit';
    vehicle: Vehicle;
    plans?: MaintenancePlan[];
    plan?: MaintenancePlan;
    record?: MaintenanceRecord;
    submitting?: boolean;
    submitLabel: string;
    serverError?: string;
    disabled?: boolean;
  }>(),
  {
    plans: () => [],
    plan: undefined,
    record: undefined,
    submitting: false,
    serverError: undefined,
    disabled: false,
  },
);
const emit = defineEmits<{ submit: [value: MaintenanceRecordDraft] }>();
const { t, n, locale } = useI18n();
const costCategories: ExpenseCategory[] = [
  'PARTS',
  'LABOR',
  'DIAGNOSTICS',
  'TOWING',
  'OTHER',
];

const description = ref('');
const performedAt = ref(toLocalDateTimeInput(new Date()));
const odometerKm = ref('');
const workshop = ref('');
const notes = ref('');
const costItems = ref<MaintenanceCostItemDraft[]>([
  { category: 'PARTS', description: '', amount: '' },
]);
const planId = ref('');
const acknowledgeStale = ref(false);
const error = ref('');

const planOptions = computed(() => [
  { label: t('maintenance.records.form.noPlan'), value: '' },
  ...props.plans.map((item) => ({ label: item.name, value: item.id })),
]);
const costCategoryOptions = computed(() =>
  costCategories.map((value) => ({
    value,
    label: t(`expenses.categories.${value}`),
  })),
);
const totalCost = computed(() => {
  const total = costItems.value.reduce((sum, item) => {
    const minor = decimalToMinorUnits(normalizeAmount(item.amount));
    return minor === undefined ? sum : sum + minor;
  }, 0n);
  return minorUnitsToDecimal(total);
});
const formattedTotalCost = computed(() =>
  formatDecimalCurrency(totalCost.value, locale.value),
);
const referenceDate = computed(() =>
  props.vehicle.currentOdometerRecordedAt
    ? new Date(props.vehicle.currentOdometerRecordedAt)
    : undefined,
);
const staleReasons = computed(() => {
  const reasons: string[] = [];
  const km = Number(odometerKm.value);
  const date = performedAt.value ? new Date(performedAt.value) : undefined;
  if (
    odometerKm.value.trim() &&
    Number.isFinite(km) &&
    km < props.vehicle.currentOdometerKm
  )
    reasons.push(
      t('maintenance.records.stale.odometer', {
        current: n(props.vehicle.currentOdometerKm),
      }),
    );
  if (
    date &&
    !Number.isNaN(date.getTime()) &&
    referenceDate.value &&
    date < referenceDate.value
  )
    reasons.push(t('maintenance.records.stale.date'));
  return reasons;
});

function reset(): void {
  description.value = props.record?.description ?? props.plan?.name ?? '';
  performedAt.value = props.record
    ? toLocalDateTimeInput(new Date(props.record.performedAt))
    : toLocalDateTimeInput(new Date());
  odometerKm.value = String(
    props.record?.odometerKm ?? props.vehicle.currentOdometerKm,
  );
  workshop.value = props.record?.workshop ?? '';
  notes.value = props.record?.notes ?? '';
  costItems.value = props.record?.costItems?.length
    ? props.record.costItems.map((item) => ({
        category: item.category,
        description: item.description,
        amount: item.amount,
      }))
    : [
        {
          category: 'PARTS',
          description: props.record?.description ?? props.plan?.name ?? '',
          amount: props.record?.totalCost ?? '',
        },
      ];
  planId.value = props.record?.planId ?? props.plan?.id ?? '';
  acknowledgeStale.value = false;
  error.value = '';
}
watch(() => [props.record, props.plan, props.vehicle], reset, {
  immediate: true,
  deep: true,
});

function normalizeAmount(value: string): string {
  return value.trim().replace(',', '.');
}

function minorUnitsToDecimal(value: bigint): string {
  const cents = value % 100n;
  const reais = value / 100n;
  return `${reais}.${cents.toString().padStart(2, '0')}`;
}

function addCostItem(defaults?: Partial<MaintenanceCostItemDraft>): void {
  costItems.value.push({
    category: defaults?.category ?? 'PARTS',
    description: defaults?.description ?? '',
    amount: defaults?.amount ?? '',
  });
}

function addLaborCostItem(): void {
  addCostItem({
    category: 'LABOR',
    description: t('maintenance.records.form.laborItem'),
  });
}

function removeCostItem(index: number): void {
  if (costItems.value.length === 1) return;
  costItems.value.splice(index, 1);
}

function submit(): void {
  const performedAtIso = localDateTimeToIso(performedAt.value);
  const km = Number(odometerKm.value);
  const normalizedCostItems = costItems.value.map((item) => ({
    category: item.category,
    description: item.description.trim(),
    amount: normalizeAmount(item.amount),
  }));
  const everyCostItemIsValid =
    normalizedCostItems.length > 0 &&
    normalizedCostItems.every(
      (item) =>
        item.description &&
        item.description.length <= 500 &&
        /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(item.amount),
    );
  if (
    !description.value.trim() ||
    description.value.trim().length > 500 ||
    !performedAtIso ||
    !Number.isInteger(km) ||
    km < 0 ||
    workshop.value.trim().length > 120 ||
    notes.value.trim().length > 2000 ||
    !everyCostItemIsValid
  ) {
    error.value = t('maintenance.records.form.validation');
    return;
  }
  if (staleReasons.value.length && !acknowledgeStale.value) {
    error.value = t('maintenance.records.stale.confirmRequired');
    return;
  }
  error.value = '';
  emit('submit', {
    description: description.value.trim(),
    performedAt: performedAtIso,
    odometerKm: km,
    ...(workshop.value.trim() ? { workshop: workshop.value.trim() } : {}),
    ...(notes.value.trim() ? { notes: notes.value.trim() } : {}),
    totalCost: totalCost.value,
    costItems: normalizedCostItems,
    ...(props.mode !== 'complete' && planId.value
      ? { planId: planId.value }
      : {}),
  });
}
</script>

<template>
  <form class="entity-form record-form" novalidate @submit.prevent="submit">
    <div class="form-grid">
      <AppInput
        id="record-description"
        v-model="description"
        :label="t('maintenance.records.form.description')"
        :disabled="disabled"
      />
      <AppSelect
        v-if="mode !== 'complete'"
        id="record-plan"
        v-model="planId"
        :label="t('maintenance.records.form.plan')"
        :options="planOptions"
        :disabled="disabled"
      />
      <div class="ui-native-field">
        <label for="record-performed-at">{{
          t('maintenance.records.form.performedAt')
        }}</label>
        <input
          id="record-performed-at"
          v-model="performedAt"
          type="datetime-local"
          :disabled="disabled"
        />
      </div>
      <AppInput
        id="record-odometer"
        v-model="odometerKm"
        :label="t('maintenance.records.form.odometer')"
        :disabled="disabled"
      />
      <AppInput
        id="record-workshop"
        v-model="workshop"
        :label="t('maintenance.records.form.workshop')"
        :disabled="disabled"
      />
    </div>
    <section
      class="record-cost-items"
      :aria-label="t('maintenance.records.form.costItems')"
    >
      <div class="cost-items-header">
        <div>
          <h2>{{ t('maintenance.records.form.costItems') }}</h2>
          <p>{{ t('maintenance.records.form.costItemsHint') }}</p>
        </div>
        <strong class="tabular">{{ formattedTotalCost }}</strong>
      </div>
      <div
        v-for="(item, index) in costItems"
        :key="index"
        class="cost-item-row"
      >
        <AppSelect
          :id="`record-cost-item-category-${index}`"
          v-model="item.category"
          :label="t('maintenance.records.form.costItemCategory')"
          :options="costCategoryOptions"
          :disabled="disabled"
        />
        <AppInput
          :id="`record-cost-item-description-${index}`"
          v-model="item.description"
          :label="t('maintenance.records.form.costItemDescription')"
          :disabled="disabled"
        />
        <AppInput
          :id="`record-cost-item-amount-${index}`"
          v-model="item.amount"
          :label="t('maintenance.records.form.costItemAmount')"
          :disabled="disabled"
          inputmode="decimal"
        />
        <AppButton
          type="button"
          variant="quiet"
          :disabled="disabled || costItems.length === 1"
          @click="removeCostItem(index)"
        >
          {{ t('maintenance.records.form.removeCostItem') }}
        </AppButton>
      </div>
      <div class="cost-item-actions">
        <AppButton
          type="button"
          variant="secondary"
          :disabled="disabled"
          @click="addCostItem()"
        >
          {{ t('maintenance.records.form.addCostItem') }}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          :disabled="disabled"
          @click="addLaborCostItem"
        >
          {{ t('maintenance.records.form.addLabor') }}
        </AppButton>
      </div>
    </section>
    <div class="ui-native-field">
      <label for="record-notes">{{
        t('maintenance.records.form.notes')
      }}</label>
      <textarea
        id="record-notes"
        v-model="notes"
        rows="4"
        maxlength="2000"
        :disabled="disabled"
      />
    </div>
    <aside v-if="staleReasons.length" class="stale-warning" role="status">
      <strong>{{ t('maintenance.records.stale.title') }}</strong>
      <ul>
        <li v-for="reason in staleReasons" :key="reason">{{ reason }}</li>
      </ul>
      <p>{{ t('maintenance.records.stale.effect') }}</p>
      <label>
        <input
          v-model="acknowledgeStale"
          type="checkbox"
          :disabled="disabled"
        />
        {{ t('maintenance.records.stale.confirm') }}
      </label>
    </aside>
    <p
      v-if="error || serverError"
      id="record-form-error"
      class="form-error"
      role="alert"
    >
      {{ error || serverError }}
    </p>
    <div class="form-actions">
      <AppButton type="submit" :loading="submitting" :disabled="disabled">{{
        submitLabel
      }}</AppButton>
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
.stale-warning {
  padding: 1rem;
  background: var(--warning-soft);
  border-left: 0.25rem solid var(--warning);
}
.stale-warning ul,
.stale-warning p {
  margin: 0.4rem 0;
}
.stale-warning label {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  font-weight: 650;
}
.record-cost-items {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-muted);
}
.cost-items-header,
.cost-item-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}
.cost-items-header h2 {
  margin: 0;
  font-size: 1rem;
}
.cost-items-header p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
}
.cost-item-row {
  display: grid;
  grid-template-columns:
    minmax(9rem, 0.8fr) minmax(12rem, 1.5fr)
    minmax(8rem, 0.8fr) auto;
  gap: 0.75rem;
  align-items: end;
}
@media (max-width: 38rem) {
  .form-grid,
  .cost-item-row,
  .cost-items-header,
  .cost-item-actions {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .cost-items-header,
  .cost-item-actions {
    display: grid;
  }
}
</style>
