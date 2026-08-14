<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  getMaintenancePlan,
  maintenanceKeys,
  updateMaintenancePlan,
} from '~/services/api/maintenance';
import type { CreateMaintenancePlanInput } from '~/types/api';
definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const planId = computed(() => String(route.params.planId));
const query = useQuery({
  queryKey: computed(() => maintenanceKeys.plan(id.value, planId.value)),
  queryFn: () => getMaintenancePlan(id.value, planId.value),
});
const mutation = useMutation({
  mutationFn: (body: CreateMaintenancePlanInput) =>
    updateMaintenancePlan(id.value, planId.value, body),
  onSuccess: async () => {
    await client.invalidateQueries({
      queryKey: maintenanceKeys.plans(id.value),
    });
    await client.invalidateQueries({
      queryKey: maintenanceKeys.agendaBase(id.value),
    });
    await navigateTo(`/vehicles/${id.value}/plans`);
  },
});
useHead({ title: computed(() => t('maintenance.edit.metaTitle')) });
</script>
<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.edit.eyebrow') }}</p>
        <h1>{{ t('maintenance.edit.title') }}</h1>
        <p>{{ t('maintenance.edit.description') }}</p>
      </div>
      <NuxtLink class="text-link" :to="`/vehicles/${id}/plans`">{{
        t('actions.back')
      }}</NuxtLink>
    </header>
    <AppSkeleton v-if="query.isPending.value" /><AppErrorState
      v-else-if="query.isError.value || !query.data.value"
      :title="t('maintenance.edit.errorTitle')"
      :description="t('maintenance.edit.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    /><MaintenancePlanForm
      v-else
      :plan="query.data.value"
      :submit-label="t('actions.save')"
      :submitting="mutation.isPending.value"
      :disabled="!isOnline"
      :server-error="
        mutation.isError.value ? t('maintenance.form.saveError') : undefined
      "
      @submit="mutation.mutate"
    />
  </div>
</template>
