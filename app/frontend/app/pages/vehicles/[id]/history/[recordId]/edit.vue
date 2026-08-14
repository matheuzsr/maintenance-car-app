<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { MaintenanceRecordDraft } from '~/components/domain/MaintenanceRecordForm.vue';
import {
  getMaintenanceRecord,
  listMaintenancePlans,
  maintenanceKeys,
  updateMaintenanceRecord,
} from '~/services/api/maintenance';
import { getVehicle, vehicleKeys } from '~/services/api/vehicles';
import { maintenanceRecordInvalidationKeys } from '~/utils/maintenance-records';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const recordId = computed(() => String(route.params.recordId));
const vehicleQuery = useQuery({
  queryKey: computed(() => vehicleKeys.detail(id.value)),
  queryFn: () => getVehicle(id.value),
});
const recordQuery = useQuery({
  queryKey: computed(() => maintenanceKeys.record(id.value, recordId.value)),
  queryFn: () => getMaintenanceRecord(id.value, recordId.value),
});
const plansQuery = useQuery({
  queryKey: computed(() =>
    maintenanceKeys.plans(id.value, { page: 1, limit: 100 }),
  ),
  queryFn: () => listMaintenancePlans(id.value, { page: 1, limit: 100 }),
});
const serverError = ref('');
const mutation = useMutation({
  mutationFn: (draft: MaintenanceRecordDraft) =>
    updateMaintenanceRecord(id.value, recordId.value, {
      ...draft,
      planId: draft.planId ?? null,
      workshop: draft.workshop ?? null,
      notes: draft.notes ?? null,
    }),
  onSuccess: async () => {
    await Promise.all(
      maintenanceRecordInvalidationKeys(id.value).map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
    await navigateTo(`/vehicles/${id.value}/history/${recordId.value}`);
  },
  onError: () => {
    serverError.value = t('maintenance.records.form.saveError');
  },
});
useHead({ title: computed(() => t('maintenance.records.edit.metaTitle')) });
</script>

<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.records.edit.eyebrow') }}</p>
        <h1>{{ t('maintenance.records.edit.title') }}</h1>
        <p>{{ t('maintenance.records.edit.description') }}</p>
      </div>
      <NuxtLink class="text-link" :to="`/vehicles/${id}/history/${recordId}`">{{
        t('actions.cancel')
      }}</NuxtLink>
    </header>
    <AppSkeleton
      v-if="
        vehicleQuery.isPending.value ||
        recordQuery.isPending.value ||
        plansQuery.isPending.value
      "
    />
    <AppErrorState
      v-else-if="
        vehicleQuery.isError.value ||
        recordQuery.isError.value ||
        plansQuery.isError.value ||
        !vehicleQuery.data.value ||
        !recordQuery.data.value
      "
      :title="t('maintenance.records.form.loadErrorTitle')"
      :description="t('maintenance.records.form.loadErrorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="
        () => {
          vehicleQuery.refetch();
          recordQuery.refetch();
          plansQuery.refetch();
        }
      "
    />
    <MaintenanceRecordForm
      v-else
      mode="edit"
      :vehicle="vehicleQuery.data.value"
      :record="recordQuery.data.value"
      :plans="plansQuery.data.value?.data ?? []"
      :submit-label="t('actions.save')"
      :submitting="mutation.isPending.value"
      :server-error="serverError"
      :disabled="!isOnline"
      @submit="mutation.mutate"
    />
  </div>
</template>
