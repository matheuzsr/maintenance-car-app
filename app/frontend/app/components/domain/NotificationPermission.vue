<script setup lang="ts">
import { BellRing, BellOff, LockKeyhole, Smartphone } from 'lucide-vue-next';

const { t } = useI18n();
const push = usePushNotifications();
const stateIcon = computed(() => {
  if (push.state.value === 'denied') return LockKeyhole;
  if (push.state.value === 'subscribed') return BellRing;
  if (push.state.value === 'install-required') return Smartphone;
  return BellOff;
});
</script>

<template>
  <section class="push-permission" aria-labelledby="push-permission-title">
    <div class="push-permission__icon" aria-hidden="true">
      <component :is="stateIcon" :size="24" :stroke-width="1.75" />
    </div>
    <div class="push-permission__copy">
      <p class="eyebrow">{{ t('notifications.push.eyebrow') }}</p>
      <h2 id="push-permission-title">
        {{ t(`notifications.push.states.${push.state.value}.title`) }}
      </h2>
      <p>
        {{ t(`notifications.push.states.${push.state.value}.description`) }}
      </p>
      <p class="privacy-note">{{ t('notifications.push.privacy') }}</p>
      <p v-if="push.error.value" class="form-error" role="alert">
        {{ t('notifications.push.error') }}
      </p>
      <p v-if="!push.isOnline.value" class="form-error" role="status">
        {{ t('notifications.push.offline') }}
      </p>
      <div class="push-permission__actions">
        <AppButton
          v-if="push.requiresReset.value"
          :loading="push.busy.value"
          :disabled="!push.isOnline.value"
          @click="push.resetForCurrentAccount"
        >
          {{ t('notifications.push.reset') }}
        </AppButton>
        <AppButton
          v-else-if="
            push.state.value === 'prompt' || push.state.value === 'unsubscribed'
          "
          :loading="push.busy.value"
          :disabled="!push.isOnline.value"
          @click="push.enable"
        >
          {{ t('notifications.push.enable') }}
        </AppButton>
        <AppButton
          v-else-if="push.state.value === 'subscribed'"
          variant="secondary"
          :loading="push.busy.value"
          :disabled="!push.isOnline.value"
          @click="push.disable"
        >
          {{ t('notifications.push.disable') }}
        </AppButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.push-permission {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 2rem);
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 0.25rem solid var(--primary);
}
.push-permission__icon {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: var(--radius-sm);
}
h2 {
  margin: 0.25rem 0;
  font-size: clamp(1.25rem, 3vw, 1.65rem);
}
.push-permission__copy > p:not(.eyebrow) {
  max-width: 44rem;
  margin: 0.35rem 0;
  color: var(--text-muted);
}
.privacy-note {
  padding-left: 0.75rem;
  border-left: 0.1875rem solid var(--warning);
  font-size: 0.875rem;
}
.push-permission__actions {
  display: flex;
  margin-top: 1rem;
}
@media (max-width: 30rem) {
  .push-permission {
    grid-template-columns: 1fr;
  }
}
</style>
