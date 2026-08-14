<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { MaintenanceRecordDraft } from '~/components/domain/MaintenanceRecordForm.vue';
import {
  completeMaintenancePlan,
  getMaintenancePlan,
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
const planId = computed(() => String(route.params.planId));
const vehicleQuery = useQuery({
  queryKey: computed(() => vehicleKeys.detail(id.value)),
  queryFn: () => getVehicle(id.value),
});
const planQuery = useQuery({
  queryKey: computed(() => maintenanceKeys.plan(id.value, planId.value)),
  queryFn: () => getMaintenancePlan(id.value, planId.value),
});
const serverError = ref('');
const mutation = useMutation({
  mutationFn: (draft: MaintenanceRecordDraft) => {
    const { planId: _planId, ...body } = draft;
    return completeMaintenancePlan(id.value, planId.value, body);
  },
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
useHead({ title: computed(() => t('maintenance.records.complete.metaTitle')) });
</script>

<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.records.complete.eyebrow') }}</p>
        <h1>{{ t('maintenance.records.complete.title') }}</h1>
        <p>{{ t('maintenance.records.complete.description') }}</p>
      </div>
      <NuxtLink class="text-link" :to="`/vehicles/${id}/agenda`">{{
        t('actions.cancel')
      }}</NuxtLink>
    </header>
    <AppSkeleton
      v-if="vehicleQuery.isPending.value || planQuery.isPending.value"
    />
    <AppErrorState
      v-else-if="
        vehicleQuery.isError.value ||
        planQuery.isError.value ||
        !vehicleQuery.data.value ||
        !planQuery.data.value
      "
      :title="t('maintenance.records.form.loadErrorTitle')"
      :description="t('maintenance.records.form.loadErrorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="
        () => {
          vehicleQuery.refetch();
          planQuery.refetch();
        }
      "
    />
    <MaintenanceRecordForm
      v-else
      mode="complete"
      :vehicle="vehicleQuery.data.value"
      :plan="planQuery.data.value"
      :submit-label="t('maintenance.records.complete.action')"
      :submitting="mutation.isPending.value"
      :server-error="serverError"
      :disabled="!isOnline"
      @submit="mutation.mutate"
    />
  </div>
</template>
