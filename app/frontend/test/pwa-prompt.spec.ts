import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppPwaPrompt from '~/components/shell/AppPwaPrompt.vue';

const AppButton = {
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
};

const messages: Record<string, string> = {
  'pwa.update.description': 'Uma nova versão está pronta.',
  'pwa.update.action': 'Atualizar agora',
  'pwa.offlineReady': 'Pronto para abrir sem conexão.',
  'actions.close': 'Fechar',
};

afterEach(() => vi.unstubAllGlobals());

describe('AppPwaPrompt', () => {
  it('offers and applies a waiting service-worker update', async () => {
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => messages[key] ?? key,
    }));
    vi.stubGlobal('useNuxtApp', () => ({
      $pwa: {
        needRefresh: true,
        offlineReady: false,
        showInstallPrompt: false,
        updateServiceWorker,
      },
    }));
    const wrapper = mount(AppPwaPrompt, {
      global: { components: { AppButton } },
    });

    expect(wrapper.text()).toContain('Uma nova versão está pronta.');
    await wrapper.get('button').trigger('click');
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('announces when the shell is ready offline and lets the user dismiss it', async () => {
    const cancelPrompt = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => messages[key] ?? key,
    }));
    vi.stubGlobal('useNuxtApp', () => ({
      $pwa: {
        needRefresh: false,
        offlineReady: true,
        showInstallPrompt: false,
        cancelPrompt,
      },
    }));
    const wrapper = mount(AppPwaPrompt, {
      global: { components: { AppButton } },
    });

    expect(wrapper.text()).toContain('Pronto para abrir sem conexão.');
    await wrapper.get('button').trigger('click');
    expect(cancelPrompt).toHaveBeenCalledOnce();
  });
});
