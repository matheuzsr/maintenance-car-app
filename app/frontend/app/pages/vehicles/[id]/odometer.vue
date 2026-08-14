<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { CreateOdometerReadingInput } from '~/types/api';
import {
  createOdometerReading,
  listOdometerReadings,
  vehicleKeys,
} from '~/services/api/vehicles';
import { localDateTimeToIso, toLocalDateTimeInput } from '~/utils/date-time';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t, n, locale } = useI18n();
const client = useQueryClient();
const id = computed(() => String(route.params.id));
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
useHead({ title: computed(() => t('odometer.metaTitle')) });
const query = useQuery({
  queryKey: computed(() => vehicleKeys.odometer(id.value)),
  queryFn: () => listOdometerReadings(id.value),
});
const odometerKm = ref('');
const recordedAt = ref(toLocalDateTimeInput(new Date()));
const confirmLowerReading = ref(false);
const error = ref('');
const mutation = useMutation({
  mutationFn: (body: CreateOdometerReadingInput) =>
    createOdometerReading(id.value, body),
  onSuccess: async () => {
    odometerKm.value = '';
    confirmLowerReading.value = false;
    await Promise.all([
      client.invalidateQueries({ queryKey: vehicleKeys.odometer(id.value) }),
      client.invalidateQueries({ queryKey: vehicleKeys.all }),
      client.invalidateQueries({ queryKey: vehicleKeys.detail(id.value) }),
    ]);
  },
  onError: () => {
    error.value = t('odometer.createError');
  },
});
function submit(): void {
  const value = Number(odometerKm.value);
  const recordedAtIso = localDateTimeToIso(recordedAt.value);
  if (
    !odometerKm.value.trim() ||
    !Number.isInteger(value) ||
    value < 0 ||
    !recordedAtIso
  ) {
    error.value = t('validation.reviewFields');
    return;
  }
  error.value = '';
  mutation.mutate({
    odometerKm: value,
    recordedAt: recordedAtIso,
    confirmLowerReading: confirmLowerReading.value,
  });
}
</script>
<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('odometer.eyebrow') }}</p>
        <h1>{{ t('odometer.title') }}</h1>
        <p>{{ t('odometer.description') }}</p>
      </div>
      <NuxtLink class="text-link" :to="`/vehicles/${id}`">{{
        t('odometer.back')
      }}</NuxtLink>
    </header>
    <form class="entity-form compact-form" @submit.prevent="submit">
      <AppInput
        id="reading"
        v-model="odometerKm"
        :label="t('odometer.fields.value')"
      />
      <div class="ui-native-field">
        <label for="reading-at">{{ t('odometer.fields.recordedAt') }}</label
        ><input id="reading-at" v-model="recordedAt" type="datetime-local" />
      </div>
      <label class="checkbox-field"
        ><input v-model="confirmLowerReading" type="checkbox" />{{
          t('odometer.fields.confirmLower')
        }}</label
      >
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <AppButton type="submit" :loading="mutation.isPending.value">{{
        t('odometer.action')
      }}</AppButton>
    </form>
    <section>
      <h2>{{ t('odometer.history') }}</h2>
      <AppSkeleton v-if="query.isPending.value" /><AppErrorState
        v-else-if="query.isError.value"
        :title="t('odometer.errorTitle')"
        :description="t('odometer.errorDescription')"
        :retry-label="t('actions.tryAgain')"
        @retry="query.refetch()"
      /><AppEmptyState
        v-else-if="!query.data.value?.data.length"
        :title="t('odometer.emptyTitle')"
        :description="t('odometer.emptyDescription')"
      />
      <ol v-else class="reading-list">
        <li v-for="reading in query.data.value.data" :key="reading.id">
          <strong class="tabular">{{ n(reading.odometerKm) }} km</strong
          ><time :datetime="reading.recordedAt">{{
            formatDate(reading.recordedAt)
          }}</time
          ><span>{{ t(`odometer.source.${reading.source}`) }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>
