<script setup lang="ts">
import { Download, RefreshCw, Wifi } from 'lucide-vue-next';
import { ref } from 'vue';

const { t } = useI18n();
const { $pwa } = useNuxtApp();
const busy = ref(false);

async function update(): Promise<void> {
  if (!$pwa) return;
  busy.value = true;
  try {
    await $pwa.updateServiceWorker(true);
  } finally {
    busy.value = false;
  }
}

async function install(): Promise<void> {
  if (!$pwa) return;
  await $pwa.install();
}
</script>

<template>
  <div
    v-if="$pwa?.needRefresh || $pwa?.offlineReady || $pwa?.showInstallPrompt"
    class="pwa-prompt"
    role="status"
    aria-live="polite"
  >
    <template v-if="$pwa.needRefresh">
      <RefreshCw :size="19" aria-hidden="true" />
      <span>{{ t('pwa.update.description') }}</span>
      <AppButton :loading="busy" @click="update">{{
        t('pwa.update.action')
      }}</AppButton>
    </template>
    <template v-else-if="$pwa.offlineReady">
      <Wifi :size="19" aria-hidden="true" />
      <span>{{ t('pwa.offlineReady') }}</span>
      <AppButton variant="quiet" @click="$pwa.cancelPrompt()">{{
        t('actions.close')
      }}</AppButton>
    </template>
    <template v-else-if="$pwa.showInstallPrompt">
      <Download :size="19" aria-hidden="true" />
      <span>{{ t('pwa.install.description') }}</span>
      <AppButton @click="install">{{ t('pwa.install.action') }}</AppButton>
      <AppButton variant="quiet" @click="$pwa.cancelInstall()">{{
        t('pwa.install.dismiss')
      }}</AppButton>
    </template>
  </div>
</template>

<style scoped>
.pwa-prompt {
  position: fixed;
  z-index: 90;
  right: 1rem;
  bottom: 1rem;
  width: min(calc(100% - 2rem), 34rem);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  color: var(--text);
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow);
}
.pwa-prompt span {
  flex: 1;
  font-size: 0.875rem;
}
@media (max-width: 40rem) {
  .pwa-prompt {
    right: 0.75rem;
    bottom: calc(var(--bottom-nav-height) + 0.75rem);
    width: calc(100% - 1.5rem);
    flex-wrap: wrap;
  }
  .pwa-prompt span {
    min-width: calc(100% - 2rem);
  }
}
</style>
