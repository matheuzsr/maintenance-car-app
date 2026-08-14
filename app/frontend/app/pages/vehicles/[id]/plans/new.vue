<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  createMaintenancePlan,
  listMaintenanceTemplates,
  maintenanceKeys,
} from '~/services/api/maintenance';
import type {
  CreateMaintenancePlanInput,
  MaintenanceTemplate,
} from '~/types/api';
definePageMeta({ middleware: 'auth' });
const route = useRoute();
const { t } = useI18n();
const client = useQueryClient();
const { isOnline } = useOnlineStatus();
const id = computed(() => String(route.params.id));
const mode = ref<'template' | 'custom'>('template');
const selected = ref<MaintenanceTemplate>();
const templates = useQuery({
  queryKey: maintenanceKeys.templates(),
  queryFn: () => listMaintenanceTemplates(),
});
const mutation = useMutation({
  mutationFn: (body: CreateMaintenancePlanInput) =>
    createMaintenancePlan(id.value, body),
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
useHead({ title: computed(() => t('maintenance.create.metaTitle')) });
</script>
<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('maintenance.create.eyebrow') }}</p>
        <h1>{{ t('maintenance.create.title') }}</h1>
        <p>{{ t('maintenance.create.description') }}</p>
      </div>
      <NuxtLink class="text-link" :to="`/vehicles/${id}/plans`">{{
        t('actions.back')
      }}</NuxtLink>
    </header>
    <div
      class="mode-tabs"
      role="tablist"
      :aria-label="t('maintenance.create.modeLabel')"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'template'"
        @click="mode = 'template'"
      >
        {{ t('maintenance.create.fromTemplate') }}</button
      ><button
        type="button"
        role="tab"
        :aria-selected="mode === 'custom'"
        @click="
          mode = 'custom';
          selected = undefined;
        "
      >
        {{ t('maintenance.create.custom') }}
      </button>
    </div>
    <template v-if="mode === 'template'"
      ><AppSkeleton v-if="templates.isPending.value" /><AppErrorState
        v-else-if="templates.isError.value"
        :title="t('maintenance.templates.errorTitle')"
        :description="t('maintenance.templates.errorDescription')"
        :retry-label="t('actions.tryAgain')"
        @retry="templates.refetch()" /><MaintenanceTemplateBrowser
        v-else
        :templates="templates.data.value ?? []"
        :selected-id="selected?.id"
        @select="selected = $event" /></template
    ><MaintenancePlanForm
      v-if="mode === 'custom' || selected"
      :key="selected?.id ?? 'custom'"
      :template="selected"
      :submit-label="t('maintenance.create.action')"
      :submitting="mutation.isPending.value"
      :disabled="!isOnline"
      :server-error="
        mutation.isError.value ? t('maintenance.form.saveError') : undefined
      "
      @submit="mutation.mutate"
    />
  </div>
</template>
<style scoped>
.mode-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}
.mode-tabs button {
  padding: 0.7rem 1rem;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-bottom: 0.2rem solid transparent;
  cursor: pointer;
}
.mode-tabs button[aria-selected='true'] {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 720;
}
</style>
