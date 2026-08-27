<script setup lang="ts">
withDefaults(defineProps<{ lines?: number; label?: string }>(), {
  lines: 3,
  label: 'Loading content',
});
</script>

<template>
  <div class="skeleton" role="status" aria-live="polite">
    <span class="sr-only">{{ label }}</span>
    <span
      v-for="line in lines"
      :key="line"
      class="skeleton__line"
      :style="{ width: `${100 - (line - 1) * 13}%` }"
    />
  </div>
</template>

<style scoped>
.skeleton {
  display: grid;
  gap: 0.625rem;
}

.skeleton__line {
  height: 0.75rem;
  display: block;
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.45;
  }
}
</style>
