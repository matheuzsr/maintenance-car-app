<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { MaintenancePlan, MaintenanceRecord, Vehicle } from '~/types/api';
import { localDateTimeToIso, toLocalDateTimeInput } from '~/utils/date-time';

export interface MaintenanceRecordDraft {
  description: string;
  performedAt: string;
  odometerKm: number;
  workshop?: string;
  notes?: string;
  totalCost: string;
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
const { t, n } = useI18n();

const description = ref('');
const performedAt = ref(toLocalDateTimeInput(new Date()));
const odometerKm = ref('');
const workshop = ref('');
const notes = ref('');
const totalCost = ref('');
const planId = ref('');
const acknowledgeStale = ref(false);
const error = ref('');

const planOptions = computed(() => [
  { label: t('maintenance.records.form.noPlan'), value: '' },
  ...props.plans.map((item) => ({ label: item.name, value: item.id })),
]);
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
  totalCost.value = props.record?.totalCost ?? '';
  planId.value = props.record?.planId ?? props.plan?.id ?? '';
  acknowledgeStale.value = false;
  error.value = '';
}
watch(() => [props.record, props.plan, props.vehicle], reset, {
  immediate: true,
  deep: true,
});

function submit(): void {
  const performedAtIso = localDateTimeToIso(performedAt.value);
  const km = Number(odometerKm.value);
  const cost = totalCost.value.trim().replace(',', '.');
  if (
    !description.value.trim() ||
    description.value.trim().length > 500 ||
    !performedAtIso ||
    !Number.isInteger(km) ||
    km < 0 ||
    workshop.value.trim().length > 120 ||
    notes.value.trim().length > 2000 ||
    !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(cost)
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
    totalCost: cost,
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
        id="record-cost"
        v-model="totalCost"
        :label="t('maintenance.records.form.cost')"
        :disabled="disabled"
        inputmode="decimal"
      />
      <AppInput
        id="record-workshop"
        v-model="workshop"
        :label="t('maintenance.records.form.workshop')"
        :disabled="disabled"
      />
    </div>
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
@media (max-width: 38rem) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
