<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next';

defineProps<{ message: string }>();
</script>

<template>
  <div class="offline-banner" role="status" aria-live="polite">
    <WifiOff :size="18" :stroke-width="1.75" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.offline-banner {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  color: var(--warning);
  background: var(--warning-soft);
  border-bottom: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
  font-size: 0.875rem;
  font-weight: 650;
}
</style>
