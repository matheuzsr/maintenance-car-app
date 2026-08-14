<script setup lang="ts">
import type { CreateVehicleInput, Vehicle } from '~/types/api';
import { localDateTimeToIso, toLocalDateTimeInput } from '~/utils/date-time';

const props = defineProps<{
  vehicle?: Vehicle;
  submitting?: boolean;
  submitLabel: string;
  error?: string;
}>();
const emit = defineEmits<{ submit: [value: CreateVehicleInput] }>();
const { t } = useI18n();
const nickname = ref(props.vehicle?.nickname ?? '');
const brand = ref(props.vehicle?.brand ?? '');
const model = ref(props.vehicle?.model ?? '');
const year = ref(props.vehicle?.year ? String(props.vehicle.year) : '');
const licensePlate = ref(String(props.vehicle?.licensePlate ?? ''));
const odometer = ref(
  props.vehicle ? String(props.vehicle.currentOdometerKm) : '',
);
const recordedAt = ref(
  props.vehicle
    ? props.vehicle.currentOdometerRecordedAt.slice(0, 16)
    : toLocalDateTimeInput(new Date()),
);
const validation = ref('');

function submit(): void {
  const numericYear = Number(year.value);
  const numericOdometer = Number(odometer.value);
  const recordedAtIso = localDateTimeToIso(recordedAt.value);
  if (
    !nickname.value.trim() ||
    !brand.value.trim() ||
    !model.value.trim() ||
    !Number.isInteger(numericYear) ||
    numericYear < 1886 ||
    numericYear > 2200 ||
    (!props.vehicle &&
      (!odometer.value.trim() ||
        !Number.isInteger(numericOdometer) ||
        numericOdometer < 0 ||
        !recordedAtIso))
  ) {
    validation.value = t('validation.reviewFields');
    return;
  }
  validation.value = '';
  emit('submit', {
    nickname: nickname.value.trim(),
    brand: brand.value.trim(),
    model: model.value.trim(),
    year: numericYear,
    licensePlate: licensePlate.value.trim()
      ? licensePlate.value.trim().toUpperCase()
      : props.vehicle
        ? null
        : undefined,
    currentOdometerKm: numericOdometer,
    currentOdometerRecordedAt: recordedAtIso ?? '',
  });
}
</script>

<template>
  <form class="entity-form" @submit.prevent="submit">
    <AppInput
      id="nickname"
      v-model="nickname"
      :label="t('vehicles.fields.nickname')"
    />
    <div class="form-grid">
      <AppInput
        id="brand"
        v-model="brand"
        :label="t('vehicles.fields.brand')"
      />
      <AppInput
        id="model"
        v-model="model"
        :label="t('vehicles.fields.model')"
      />
      <AppInput id="year" v-model="year" :label="t('vehicles.fields.year')" />
      <AppInput
        id="license-plate"
        v-model="licensePlate"
        :label="t('vehicles.fields.licensePlate')"
      />
    </div>
    <div v-if="!vehicle" class="form-grid">
      <AppInput
        id="odometer"
        v-model="odometer"
        :label="t('vehicles.fields.odometer')"
      />
      <div class="ui-native-field">
        <label for="recorded-at">{{ t('vehicles.fields.recordedAt') }}</label
        ><input id="recorded-at" v-model="recordedAt" type="datetime-local" />
      </div>
    </div>
    <p v-if="validation || error" class="form-error" role="alert">
      {{ validation || error }}
    </p>
    <div class="form-actions">
      <AppButton type="submit" :loading="submitting">{{
        submitLabel
      }}</AppButton>
    </div>
  </form>
</template>
