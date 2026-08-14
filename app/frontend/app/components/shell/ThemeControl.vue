<script setup lang="ts">
import type { ThemePreference } from '~/stores/preferences';

const { t } = useI18n();
const preferences = usePreferencesStore();
const options = computed(() => [
  { value: 'system', label: t('theme.system') },
  { value: 'light', label: t('theme.light') },
  { value: 'dark', label: t('theme.dark') },
]);

const selected = computed({
  get: () => preferences.theme,
  set: (value: string) => preferences.setTheme(value as ThemePreference),
});
</script>

<template>
  <AppSelect
    id="theme-preference"
    v-model="selected"
    :label="t('theme.label')"
    :options="options"
    compact
  />
</template>
