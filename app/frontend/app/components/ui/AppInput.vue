<script setup lang="ts">
import InputText from 'primevue/inputtext';

const props = withDefaults(
  defineProps<{
    id: string;
    label: string;
    modelValue?: string;
    type?: 'text' | 'email' | 'password' | 'search';
    placeholder?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
    autocomplete?: string;
    inputmode?:
      | 'none'
      | 'text'
      | 'decimal'
      | 'numeric'
      | 'tel'
      | 'search'
      | 'email'
      | 'url';
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: undefined,
    hint: undefined,
    error: undefined,
    disabled: false,
    autocomplete: undefined,
    inputmode: undefined,
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const descriptionId = computed(() =>
  props.error
    ? `${props.id}-error`
    : props.hint
      ? `${props.id}-hint`
      : undefined,
);
</script>

<template>
  <div class="ui-field">
    <label :for="id" class="ui-field__label">{{ label }}</label>
    <InputText
      :id="id"
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-invalid="Boolean(error)"
      :aria-describedby="descriptionId"
      class="ui-input"
      @update:model-value="emit('update:modelValue', String($event ?? ''))"
    />
    <p v-if="error" :id="`${id}-error`" class="ui-field__error" role="alert">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" class="ui-field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.ui-field {
  display: grid;
  gap: 0.375rem;
}

.ui-field__label {
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 680;
}

.ui-input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
}

.ui-input::placeholder {
  color: var(--text-muted);
}

.ui-input[aria-invalid='true'] {
  border-color: var(--danger);
}

.ui-input:disabled {
  color: var(--text-muted);
  background: var(--surface-muted);
  cursor: not-allowed;
}

.ui-field__hint,
.ui-field__error {
  margin: 0;
  font-size: 0.8125rem;
}

.ui-field__hint {
  color: var(--text-muted);
}

.ui-field__error {
  color: var(--danger);
}
</style>
