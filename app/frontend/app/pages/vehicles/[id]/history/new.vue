<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { MaintenanceRecordDraft } from '~/components/domain/MaintenanceRecordForm.vue';
import {
  createMaintenanceRecord,
  listMaintenancePlans,
  maintenanceKeys,
} from '~/services/api/maintenance';
import { getVehicle, vehicleKeys } from '~/services/api/vehicles';
import { maintenanceRecordInvalidationKeys } from '~/utils/maintenance-records';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const vehicleQuery = useQuery({
  queryKey: computed(() => vehicleKeys.detail(id.value)),
  queryFn: () => getVehicle(id.value),
});
const plansQuery = useQuery({
  queryKey: computed(() =>
    maintenanceKeys.plans(id.value, { page: 1, limit: 100, active: true }),
  ),
  queryFn: () =>
    listMaintenancePlans(id.value, { page: 1, limit: 100, active: true }),
});
const serverError = ref('');
const mutation = useMutation({
  mutationFn: (body: MaintenanceRecordDraft) =>
    createMaintenanceRecord(id.value, body),
  onSuccess: async (record) => {
    await Promise.all(
      maintenanceRecordInvalidationKeys(id.value).map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
    await navigateTo(`/vehicles/${id.value}/history/${record.id}`);
  },
  onError: () => {
    serverError.value = t('maintenance.records.form.saveError');
  },
});
useHead({ title: computed(() => t('maintenance.records.create.metaTitle')) });
</script>

<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.records.create.eyebrow') }}</p>
        <h1>{{ t('maintenance.records.create.title') }}</h1>
        <p>{{ t('maintenance.records.create.description') }}</p>
      </div>
      <NuxtLink class="text-link" :to="`/vehicles/${id}/history`">{{
        t('actions.cancel')
      }}</NuxtLink>
    </header>
    <AppSkeleton
      v-if="vehicleQuery.isPending.value || plansQuery.isPending.value"
    />
    <AppErrorState
      v-else-if="
        vehicleQuery.isError.value ||
        plansQuery.isError.value ||
        !vehicleQuery.data.value
      "
      :title="t('maintenance.records.form.loadErrorTitle')"
      :description="t('maintenance.records.form.loadErrorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="
        () => {
          vehicleQuery.refetch();
          plansQuery.refetch();
        }
      "
    />
    <MaintenanceRecordForm
      v-else
      mode="standalone"
      :vehicle="vehicleQuery.data.value"
      :plans="plansQuery.data.value?.data ?? []"
      :submit-label="t('maintenance.records.create.action')"
      :submitting="mutation.isPending.value"
      :server-error="serverError"
      :disabled="!isOnline"
      @submit="mutation.mutate"
    />
  </div>
</template>
