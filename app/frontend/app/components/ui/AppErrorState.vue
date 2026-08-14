<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';

defineProps<{ title: string; description: string; retryLabel?: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <section class="error-state" role="alert">
    <TriangleAlert :size="22" :stroke-width="1.75" aria-hidden="true" />
    <div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
    <AppButton v-if="retryLabel" variant="secondary" @click="$emit('retry')">{{
      retryLabel
    }}</AppButton>
  </section>
</template>

<style scoped>
.error-state {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  color: var(--danger);
  background: var(--danger-soft);
  border-left: 0.25rem solid var(--danger);
}
h3,
p {
  margin: 0;
}
h3 {
  font-size: 0.9375rem;
}
p {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}
.error-state > div {
  flex: 1;
}
</style>
