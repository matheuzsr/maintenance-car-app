<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import type { MaintenanceCategory, MaintenanceTemplate } from '~/types/api';

const props = defineProps<{
  templates: MaintenanceTemplate[];
  selectedId?: string;
}>();
defineEmits<{ select: [template: MaintenanceTemplate] }>();
const { t, n } = useI18n();
const search = ref('');
const category = ref('');
const categories = computed(() => [
  { label: t('maintenance.templates.allCategories'), value: '' },
  ...(
    [
      ...new Set(props.templates.map((item) => item.category)),
    ] as MaintenanceCategory[]
  ).map((value) => ({ label: t(`maintenance.categories.${value}`), value })),
]);
const filtered = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  return props.templates.filter(
    (item) =>
      (!category.value || item.category === category.value) &&
      (!term || item.name.toLocaleLowerCase('pt-BR').includes(term)),
  );
});
</script>

<template>
  <section
    class="template-browser"
    :aria-label="t('maintenance.templates.title')"
  >
    <div class="template-filters">
      <AppInput
        id="template-search"
        v-model="search"
        type="search"
        :label="t('maintenance.templates.search')"
      />
      <AppSelect
        id="template-category"
        v-model="category"
        :label="t('maintenance.templates.category')"
        :options="categories"
      />
    </div>
    <AppEmptyState
      v-if="!filtered.length"
      :title="t('maintenance.templates.emptyTitle')"
      :description="t('maintenance.templates.emptyDescription')"
    />
    <ul v-else class="template-list">
      <li v-for="template in filtered" :key="template.id">
        <button
          type="button"
          :aria-pressed="selectedId === template.id"
          @click="$emit('select', template)"
        >
          <Search :size="18" aria-hidden="true" />
          <span
            ><strong>{{ template.name }}</strong
            ><small>{{
              t(`maintenance.categories.${template.category}`)
            }}</small></span
          >
          <span class="intervals">
            <small v-if="template.suggestedIntervalMonths">{{
              t('maintenance.interval.months', {
                count: n(Number(template.suggestedIntervalMonths)),
              })
            }}</small>
            <small v-if="template.suggestedIntervalKm">{{
              t('maintenance.interval.km', {
                km: n(Number(template.suggestedIntervalKm)),
              })
            }}</small>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.template-browser {
  display: grid;
  gap: 1rem;
}
.template-filters {
  display: grid;
  grid-template-columns: 1fr minmax(12rem, 0.45fr);
  gap: 1rem;
}
.template-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--border);
}
.template-list button {
  width: 100%;
  min-height: 4.75rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.85rem;
  padding: 0.8rem;
  color: var(--text);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--border);
  text-align: left;
  cursor: pointer;
}
.template-list button:hover,
.template-list button[aria-pressed='true'] {
  background: var(--primary-soft);
}
.template-list span:not(.intervals) {
  display: grid;
}
.template-list small {
  color: var(--text-muted);
}
.intervals {
  display: grid;
  text-align: right;
}
@media (max-width: 38rem) {
  .template-filters {
    grid-template-columns: 1fr;
  }
  .template-list button {
    grid-template-columns: auto 1fr;
  }
  .intervals {
    grid-column: 2;
    text-align: left;
  }
}
</style>
