<script setup lang="ts">
import PrimeButton from 'primevue/button';

withDefaults(
  defineProps<{
    label?: string;
    variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    block?: boolean;
  }>(),
  {
    label: undefined,
    variant: 'primary',
    loading: false,
    disabled: false,
    type: 'button',
    block: false,
  },
);

defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <PrimeButton
    :label="label"
    :type="type"
    :loading="loading"
    :disabled="disabled || loading"
    :aria-busy="loading"
    class="ui-button"
    :class="[`ui-button--${variant}`, { 'ui-button--block': block }]"
    @click="$emit('click', $event)"
  >
    <template v-if="$slots.default" #default>
      <span class="ui-button__content"><slot /></span>
    </template>
  </PrimeButton>
</template>

<style scoped>
.ui-button {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 720;
  line-height: 1.2;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.ui-button--primary {
  color: var(--on-primary);
  background: var(--primary);
  border-color: var(--primary);
}

.ui-button--primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.ui-button--secondary {
  color: var(--text);
  background: var(--surface);
  border-color: var(--border-strong);
}

.ui-button--secondary:hover:not(:disabled),
.ui-button--quiet:hover:not(:disabled) {
  background: var(--surface-muted);
}

.ui-button--quiet {
  color: var(--primary);
  background: transparent;
}

.ui-button--danger {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: color-mix(in srgb, var(--danger) 35%, transparent);
}

.ui-button--block {
  width: 100%;
}

.ui-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ui-button__content {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
