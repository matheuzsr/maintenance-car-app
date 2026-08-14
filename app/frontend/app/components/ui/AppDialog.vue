<script setup lang="ts">
import Dialog from 'primevue/dialog';

withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    closeLabel: string;
  }>(),
  {},
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();
</script>

<template>
  <Dialog
    :visible="modelValue"
    modal
    :header="title"
    :close-button-props="{ 'aria-label': closeLabel }"
    :pt="{
      mask: { class: 'ui-dialog-mask' },
      root: { class: 'ui-dialog' },
      header: { class: 'ui-dialog-header' },
      headerActions: { class: 'ui-dialog-header-actions' },
      content: { class: 'ui-dialog-content' },
      footer: { class: 'ui-dialog-footer' },
    }"
    @update:visible="emit('update:modelValue', $event)"
    @hide="emit('close')"
  >
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </Dialog>
</template>
