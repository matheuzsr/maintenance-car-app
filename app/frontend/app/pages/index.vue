<script setup lang="ts">
import type { ApiError } from '~/types/api';
import { getApiHealth } from '~/services/api/health';

const { t } = useI18n();
const state = ref<'checking' | 'online' | 'offline'>('checking');
const detail = ref<ApiError>();

async function checkHealth(): Promise<void> {
  state.value = 'checking';
  detail.value = undefined;

  try {
    const health = await getApiHealth();
    state.value = health.status === 'ok' ? 'online' : 'offline';
  } catch (error) {
    state.value = 'offline';
    detail.value = error as ApiError;
  }
}

onMounted(() => void checkHealth());
</script>

<template>
  <main class="health-page">
    <header class="brand">
      <span class="brand-mark" aria-hidden="true">G</span>
      <span>{{ t('app.name') }}</span>
    </header>

    <section class="health-layout" aria-labelledby="health-title">
      <div class="intro">
        <p class="eyebrow">{{ t('health.eyebrow') }}</p>
        <h1 id="health-title">{{ t('health.title') }}</h1>
        <p class="description">{{ t('health.description') }}</p>
      </div>

      <aside class="status-panel" aria-live="polite">
        <div class="status-heading">
          <span class="status-light" :data-state="state" aria-hidden="true" />
          <div>
            <span class="status-label">{{ t('health.apiLabel') }}</span>
            <strong>{{ t(`health.${state}`) }}</strong>
          </div>
        </div>

        <p v-if="state === 'online'">{{ t('health.onlineDetail') }}</p>
        <p v-else-if="state === 'offline'">{{ t('health.offlineDetail') }}</p>

        <details v-if="detail" class="technical-detail">
          <summary>{{ t('health.technicalDetail') }}</summary>
          <code>{{ detail.message }}</code>
        </details>

        <button
          type="button"
          :disabled="state === 'checking'"
          @click="checkHealth"
        >
          {{ t('health.retry') }}
        </button>
      </aside>
    </section>

    <footer>
      <span>{{ t('health.foundation') }}</span>
      <span>{{ t('health.foundationDetail') }}</span>
    </footer>
  </main>
</template>
