<script setup lang="ts">
import { computed } from 'vue';

interface VehicleOption {
  id: string;
  label: string;
}

const props = defineProps<{
  vehicles: VehicleOption[];
  modelValue?: string;
  label: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const options = computed(() =>
  props.vehicles.map(({ id, label }) => ({ value: id, label })),
);
</script>

<template>
  <AppSelect
    v-if="vehicles.length > 1"
    id="global-vehicle"
    :model-value="modelValue"
    :options="options"
    :label="label"
    compact
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
