<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { CarFront, Plus } from 'lucide-vue-next';
import { listVehicles, vehicleKeys } from '~/services/api/vehicles';

definePageMeta({ middleware: 'auth' });
const { t } = useI18n();
useHead({ title: computed(() => t('vehicles.list.metaTitle')) });
const query = useQuery({ queryKey: vehicleKeys.all, queryFn: listVehicles });
</script>

<template>
  <div class="entity-page">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('vehicles.list.eyebrow') }}</p>
        <h1>{{ t('vehicles.list.title') }}</h1>
        <p>{{ t('vehicles.list.description') }}</p>
      </div>
      <NuxtLink class="button-link" to="/vehicles/new"
        ><Plus :size="18" aria-hidden="true" />{{
          t('vehicles.list.create')
        }}</NuxtLink
      >
    </header>
    <AppSkeleton v-if="query.isPending.value" />
    <AppErrorState
      v-else-if="query.isError.value"
      :title="t('vehicles.list.errorTitle')"
      :description="t('vehicles.list.errorDescription')"
      :retry-label="t('actions.tryAgain')"
      @retry="query.refetch()"
    />
    <AppEmptyState
      v-else-if="!query.data.value?.data.length"
      :title="t('vehicles.list.emptyTitle')"
      :description="t('vehicles.list.emptyDescription')"
      ><NuxtLink class="button-link" to="/vehicles/new">{{
        t('vehicles.list.create')
      }}</NuxtLink></AppEmptyState
    >
    <ul v-else class="entity-list">
      <li v-for="vehicle in query.data.value.data" :key="vehicle.id">
        <NuxtLink :to="`/vehicles/${vehicle.id}`">
          <CarFront :size="22" aria-hidden="true" /><span
            ><strong>{{ vehicle.nickname }}</strong
            ><small
              >{{ vehicle.brand }} {{ vehicle.model }} ·
              {{ vehicle.year }}</small
            ></span
          ><span class="tabular"
            >{{ vehicle.currentOdometerKm.toLocaleString('pt-BR') }} km</span
          >
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
