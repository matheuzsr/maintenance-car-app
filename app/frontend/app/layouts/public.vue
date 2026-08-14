<script setup lang="ts">
const { t } = useI18n();
const preferences = usePreferencesStore();
onMounted(preferences.initialize);
onUnmounted(preferences.dispose);
</script>

<template>
  <div class="public-shell">
    <a class="skip-link" href="#main-content">{{ t('a11y.skipToContent') }}</a>
    <header class="public-header">
      <NuxtLink to="/" class="public-brand"
        ><span aria-hidden="true">G</span>{{ t('app.name') }}</NuxtLink
      >
      <ThemeControl />
    </header>
    <main id="main-content" class="public-main"><slot /></main>
    <footer>{{ t('shell.publicFooter') }}</footer>
  </div>
</template>

<style scoped>
.public-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  width: min(100% - 2rem, 72rem);
  margin-inline: auto;
}
.public-header {
  min-height: 5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border);
}
.public-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 780;
  text-decoration: none;
}
.public-brand span {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  color: var(--on-primary);
  background: var(--primary);
  border-radius: var(--radius-sm);
}
.public-header :deep(.ui-select-field) {
  width: 10rem;
}
.public-main {
  display: grid;
  place-items: center;
  padding-block: 3rem;
}
footer {
  min-height: 4rem;
  display: flex;
  align-items: center;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
}
</style>
