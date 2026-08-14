<script setup lang="ts">
definePageMeta({ middleware: 'auth' });
const { t } = useI18n();
useHead({ title: computed(() => t('notifications.settings.metaTitle')) });
</script>

<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('notifications.settings.eyebrow') }}</p>
        <h1>{{ t('notifications.settings.title') }}</h1>
        <p>{{ t('notifications.settings.description') }}</p>
      </div>
    </header>
    <NotificationPermission />
    <nav class="settings-links" :aria-label="t('settings.navigation')">
      <NuxtLink to="/notifications">{{
        t('notifications.settings.openInbox')
      }}</NuxtLink>
      <NuxtLink to="/settings/attachments">{{
        t('settings.attachments.link')
      }}</NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.settings-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.settings-links a {
  color: var(--primary);
  font-weight: 700;
}
</style>
