<script setup lang="ts">
import { Wrench } from 'lucide-vue-next';

defineProps<{ title: string; description: string; actionLabel?: string }>();
defineEmits<{ action: [] }>();
</script>

<template>
  <section class="empty-state">
    <Wrench :size="22" :stroke-width="1.75" aria-hidden="true" />
    <div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
    <AppButton v-if="actionLabel" variant="secondary" @click="$emit('action')">
      {{ actionLabel }}
    </AppButton>
  </section>
</template>

<style scoped>
.empty-state {
  min-height: 11rem;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  color: var(--text-muted);
  text-align: center;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
}

h3,
p {
  margin: 0;
}
h3 {
  color: var(--text);
  font-size: 1rem;
}
p {
  max-width: 36rem;
  margin-top: 0.25rem;
  font-size: 0.875rem;
}
</style>
