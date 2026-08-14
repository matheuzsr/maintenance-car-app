<script setup lang="ts">
import { Paperclip } from 'lucide-vue-next';

definePageMeta({ middleware: 'auth' });
const { t } = useI18n();
useHead({ title: computed(() => t('settings.attachments.metaTitle')) });
</script>

<template>
  <div class="entity-page narrow">
    <header class="entity-heading">
      <div>
        <p class="eyebrow">{{ t('settings.attachments.eyebrow') }}</p>
        <h1>{{ t('settings.attachments.title') }}</h1>
        <p>{{ t('settings.attachments.description') }}</p>
      </div>
    </header>
    <section class="future-setting" aria-labelledby="attachments-setting-title">
      <Paperclip :size="24" aria-hidden="true" />
      <div>
        <div class="future-setting__heading">
          <h2 id="attachments-setting-title">
            {{ t('settings.attachments.settingTitle') }}
          </h2>
          <AppStatusBadge
            status="neutral"
            :label="t('settings.attachments.planned')"
          />
        </div>
        <p>{{ t('settings.attachments.futureExplanation') }}</p>
        <AppButton disabled variant="secondary">{{
          t('settings.attachments.configure')
        }}</AppButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.future-setting {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 2rem);
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
}
.future-setting__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
h2 {
  margin: 0;
  color: var(--text);
  font-size: 1.25rem;
}
p {
  max-width: 42rem;
}
</style>
