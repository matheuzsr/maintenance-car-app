<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    status?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  }>(),
  { status: 'neutral' },
);
</script>

<template>
  <span class="status-badge" :class="`status-badge--${status}`">
    <span class="status-badge__mark" aria-hidden="true" />
    {{ label }}
  </span>
</template>

<style scoped>
.status-badge {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  color: var(--text-muted);
  background: var(--surface-muted);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 720;
}

.status-badge__mark {
  width: 0.4375rem;
  height: 0.4375rem;
  background: currentColor;
  border-radius: 50%;
}

.status-badge--success {
  color: var(--success);
  background: var(--success-soft);
}

.status-badge--warning {
  color: var(--warning);
  background: var(--warning-soft);
}

.status-badge--danger {
  color: var(--danger);
  background: var(--danger-soft);
}

.status-badge--info {
  color: var(--info);
  background: var(--info-soft);
}
</style>
