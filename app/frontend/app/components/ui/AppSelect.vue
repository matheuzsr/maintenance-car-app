<script setup lang="ts">
import PrimeSelect from 'primevue/select';

export interface AppSelectOption {
  label: string;
  value: string;
}

withDefaults(
  defineProps<{
    id: string;
    label: string;
    modelValue?: string;
    options: AppSelectOption[];
    hint?: string;
    disabled?: boolean;
    compact?: boolean;
  }>(),
  {
    modelValue: undefined,
    hint: undefined,
    disabled: false,
    compact: false,
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <div class="ui-select-field" :class="{ 'ui-select-field--compact': compact }">
    <label :for="id" class="ui-select-field__label">{{ label }}</label>
    <PrimeSelect
      :id="id"
      :model-value="modelValue"
      :options="options"
      option-label="label"
      option-value="value"
      :disabled="disabled"
      :aria-describedby="hint ? `${id}-hint` : undefined"
      class="ui-select"
      :pt="{
        label: { class: 'ui-select__label' },
        dropdown: { class: 'ui-select__dropdown' },
        overlay: { class: 'ui-select__overlay' },
        list: { class: 'ui-select__list' },
        option: { class: 'ui-select__option' },
      }"
      @update:model-value="emit('update:modelValue', String($event))"
    />
    <p v-if="hint" :id="`${id}-hint`" class="ui-select-field__hint">
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>
.ui-select-field {
  display: grid;
  gap: 0.375rem;
}

.ui-select-field__label {
  font-size: 0.875rem;
  font-weight: 680;
}

.ui-select {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.ui-select-field--compact .ui-select-field__label {
  font-size: 0.6875rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ui-select-field__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

:global(.ui-select__label) {
  flex: 1;
  padding: 0.625rem 0.75rem;
}

:global(.ui-select__dropdown) {
  width: 2.75rem;
  display: grid;
  place-items: center;
}

:global(.ui-select__overlay) {
  z-index: 80;
  color: var(--text);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}

:global(.ui-select__list) {
  margin: 0;
  padding: 0.375rem;
  list-style: none;
}

:global(.ui-select__option) {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

:global(.ui-select__option[data-p-focused='true']) {
  background: var(--surface-muted);
}

:global(.ui-select__option[aria-selected='true']) {
  color: var(--primary);
  background: var(--primary-soft);
  font-weight: 700;
}
</style>
