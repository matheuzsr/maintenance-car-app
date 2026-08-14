<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  CreateMaintenancePlanInput,
  MaintenanceCategory,
  MaintenancePlan,
  MaintenanceTemplate,
} from '~/types/api';

const props = withDefaults(
  defineProps<{
    plan?: MaintenancePlan;
    template?: MaintenanceTemplate;
    submitting?: boolean;
    submitLabel: string;
    serverError?: string;
    disabled?: boolean;
  }>(),
  {
    plan: undefined,
    template: undefined,
    submitting: false,
    serverError: undefined,
    disabled: false,
  },
);
const emit = defineEmits<{ submit: [value: CreateMaintenancePlanInput] }>();
const { t } = useI18n();

const categories: MaintenanceCategory[] = [
  'ENGINE',
  'FILTERS',
  'BRAKES',
  'TRANSMISSION',
  'SUSPENSION',
  'TIRES',
  'ELECTRICAL',
  'COOLING',
  'OTHER',
];
const categoryOptions = computed(() =>
  categories.map((value) => ({
    label: t(`maintenance.categories.${value}`),
    value,
  })),
);
const name = ref('');
const description = ref('');
const category = ref<MaintenanceCategory>('OTHER');
const intervalMonths = ref('');
const intervalKm = ref('');
const alertBeforeDays = ref('30');
const alertBeforeKm = ref('1000');
const active = ref(true);
const error = ref('');

function resetFromSource(): void {
  const source = props.plan ?? props.template;
  name.value = source?.name ?? '';
  description.value =
    typeof source?.description === 'string' ? source.description : '';
  category.value = source?.category ?? 'OTHER';
  intervalMonths.value = String(
    Number(
      props.plan?.intervalMonths ?? props.template?.suggestedIntervalMonths,
    ) || '',
  );
  intervalKm.value = String(
    Number(props.plan?.intervalKm ?? props.template?.suggestedIntervalKm) || '',
  );
  alertBeforeDays.value = String(props.plan?.alertBeforeDays ?? 30);
  alertBeforeKm.value = String(props.plan?.alertBeforeKm ?? 1000);
  active.value = props.plan?.active ?? true;
  error.value = '';
}
watch(() => [props.plan, props.template], resetFromSource, {
  immediate: true,
  deep: true,
});

const optionalInteger = (value: string | number) =>
  String(value).trim() ? Number(value) : null;
function submit(): void {
  const months = optionalInteger(intervalMonths.value);
  const km = optionalInteger(intervalKm.value);
  const daysAlert = Number(alertBeforeDays.value);
  const kmAlert = Number(alertBeforeKm.value);
  if (
    !name.value.trim() ||
    name.value.trim().length > 120 ||
    description.value.length > 1000 ||
    !category.value ||
    (months === null && km === null) ||
    (months !== null &&
      (!Number.isInteger(months) || months < 1 || months > 1200)) ||
    (km !== null && (!Number.isInteger(km) || km < 1 || km > 10000000)) ||
    !Number.isInteger(daysAlert) ||
    daysAlert < 0 ||
    daysAlert > 3650 ||
    !Number.isInteger(kmAlert) ||
    kmAlert < 0 ||
    kmAlert > 10000000
  ) {
    error.value = t('maintenance.form.validation');
    return;
  }
  error.value = '';
  emit('submit', {
    ...(props.template && !props.plan ? { templateId: props.template.id } : {}),
    name: name.value.trim(),
    description: description.value.trim() || null,
    category: category.value,
    intervalMonths: months,
    intervalKm: km,
    alertBeforeDays: daysAlert,
    alertBeforeKm: kmAlert,
    active: active.value,
  });
}
</script>

<template>
  <form class="entity-form" novalidate @submit.prevent="submit">
    <div class="form-grid">
      <AppInput
        id="plan-name"
        v-model="name"
        :label="t('maintenance.form.name')"
        :disabled="disabled"
        :error="error || undefined"
      />
      <AppSelect
        id="plan-category"
        v-model="category"
        :label="t('maintenance.form.category')"
        :options="categoryOptions"
        :disabled="disabled"
      />
      <div class="ui-native-field">
        <label for="plan-months">{{
          t('maintenance.form.intervalMonths')
        }}</label>
        <input
          id="plan-months"
          v-model="intervalMonths"
          type="number"
          min="1"
          max="1200"
          :disabled="disabled"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? 'plan-form-error' : undefined"
          inputmode="numeric"
        />
      </div>
      <div class="ui-native-field">
        <label for="plan-km">{{ t('maintenance.form.intervalKm') }}</label>
        <input
          id="plan-km"
          v-model="intervalKm"
          type="number"
          min="1"
          max="10000000"
          :disabled="disabled"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? 'plan-form-error' : undefined"
          inputmode="numeric"
        />
      </div>
      <div class="ui-native-field">
        <label for="plan-alert-days">{{
          t('maintenance.form.alertBeforeDays')
        }}</label>
        <input
          id="plan-alert-days"
          v-model="alertBeforeDays"
          type="number"
          min="0"
          max="3650"
          :disabled="disabled"
          inputmode="numeric"
        />
      </div>
      <div class="ui-native-field">
        <label for="plan-alert-km">{{
          t('maintenance.form.alertBeforeKm')
        }}</label>
        <input
          id="plan-alert-km"
          v-model="alertBeforeKm"
          type="number"
          min="0"
          max="10000000"
          :disabled="disabled"
          inputmode="numeric"
        />
      </div>
    </div>
    <div class="ui-native-field">
      <label for="plan-description">{{
        t('maintenance.form.description')
      }}</label>
      <textarea
        id="plan-description"
        v-model="description"
        rows="3"
        maxlength="1000"
        :disabled="disabled"
      />
    </div>
    <label class="checkbox-field"
      ><input v-model="active" type="checkbox" :disabled="disabled" />{{
        t('maintenance.form.active')
      }}</label
    >
    <p
      v-if="error || serverError"
      id="plan-form-error"
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
.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
@media (max-width: 38rem) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
