<script setup lang="ts">
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { CreateVehicleInput } from '~/types/api';
import { createVehicle, vehicleKeys } from '~/services/api/vehicles';

definePageMeta({ middleware: 'auth' });
const { t } = useI18n();
const queryClient = useQueryClient();
const selection = useVehicleSelectionStore();
useHead({ title: computed(() => t('vehicles.create.metaTitle')) });
const mutation = useMutation({
  mutationFn: createVehicle,
  onSuccess: async (vehicle) => {
    selection.select(vehicle.id);
    await queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
    await navigateTo(`/vehicles/${vehicle.id}`);
  },
});
function submit(input: CreateVehicleInput): void {
  mutation.mutate(input);
}
</script>
<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('vehicles.create.eyebrow') }}</p>
        <h1>{{ t('vehicles.create.title') }}</h1>
        <p>{{ t('vehicles.create.description') }}</p>
      </div>
    </header>
    <VehicleForm
      :submit-label="t('vehicles.create.action')"
      :submitting="mutation.isPending.value"
      :error="mutation.isError.value ? t('vehicles.create.error') : undefined"
      @submit="submit"
    />
  </div>
</template>
