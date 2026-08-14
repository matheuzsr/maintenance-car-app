<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { CreateVehicleInput } from '~/types/api';
import {
  deleteVehicle,
  getVehicle,
  updateVehicle,
  vehicleKeys,
} from '~/services/api/vehicles';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t } = useI18n();
const queryClient = useQueryClient();
const selection = useVehicleSelectionStore();
const id = computed(() => String(route.params.id));
const query = useQuery({
  queryKey: computed(() => vehicleKeys.detail(id.value)),
  queryFn: () => getVehicle(id.value),
});
useHead({
  title: computed(() =>
    query.data.value
      ? `${query.data.value.nickname} · ${t('app.name')}`
      : t('vehicles.detail.metaTitle'),
  ),
});
const update = useMutation({
  mutationFn: (body: CreateVehicleInput) =>
    updateVehicle(id.value, {
      nickname: body.nickname,
      brand: body.brand,
      model: body.model,
      year: body.year,
      licensePlate: body.licensePlate,
    }),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    await query.refetch();
  },
});
const remove = useMutation({
  mutationFn: () => deleteVehicle(id.value),
  onSuccess: async () => {
    selection.select(undefined);
    await queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    await navigateTo('/vehicles');
  },
});
function confirmDelete(): void {
  if (window.confirm(t('vehicles.detail.deleteConfirm'))) remove.mutate();
}
</script>
<template>
  <div class="entity-page narrow">
    <AppSkeleton v-if="query.isPending.value" />
    <AppErrorState
      v-else-if="query.isError.value || !query.data.value"
      :title="t('vehicles.detail.errorTitle')"
      :description="t('vehicles.detail.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <template v-else>
      <header class="entity-heading">
        <div>
          <p class="eyebrow">{{ t('vehicles.detail.eyebrow') }}</p>
          <h1>{{ query.data.value.nickname }}</h1>
          <p>{{ query.data.value.brand }} {{ query.data.value.model }}</p>
        </div>
        <NuxtLink
          class="button-link secondary"
          :to="`/vehicles/${id}/odometer`"
          >{{ t('vehicles.detail.odometer') }}</NuxtLink
        >
      </header>
      <VehicleForm
        :vehicle="query.data.value"
        :submit-label="t('actions.save')"
        :submitting="update.isPending.value"
        :error="
          update.isError.value ? t('vehicles.detail.updateError') : undefined
        "
        @submit="update.mutate"
      />
      <section class="danger-zone">
        <h2>{{ t('vehicles.detail.dangerTitle') }}</h2>
        <p>{{ t('vehicles.detail.dangerDescription') }}</p>
        <AppButton
          variant="danger"
          :loading="remove.isPending.value"
          @click="confirmDelete"
          >{{ t('actions.delete') }}</AppButton
        >
      </section>
    </template>
  </div>
</template>
