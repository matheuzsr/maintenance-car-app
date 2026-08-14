import { defineStore } from 'pinia';
import { useQueryClient } from '@tanstack/vue-query';
import { computed, ref } from 'vue';
import type { AuthenticatedUser, LoginInput, RegisterInput } from '~/types/api';
import { useAuthTransport } from '~/services/api/auth-transport';
import { runRefreshExclusive } from '~/services/api/refresh-lock';
import { useVehicleSelectionStore } from '~/stores/vehicle-selection';

export const useSessionStore = defineStore('session', () => {
  const accessToken = ref<string>();
  const user = ref<AuthenticatedUser>();
  const initialized = ref(false);
  let refreshRequest: Promise<boolean> | undefined;

  const authenticated = computed(() =>
    Boolean(accessToken.value && user.value),
  );

  function clearAuthenticatedClientState(): void {
    useQueryClient().clear();
    useVehicleSelectionStore().select(undefined);
  }

  async function establish(
    action: 'login' | 'register',
    input: LoginInput | RegisterInput,
  ): Promise<void> {
    const transport = useAuthTransport();
    const response =
      action === 'login'
        ? await transport.login(input as LoginInput)
        : await transport.register(input as RegisterInput);
    clearAuthenticatedClientState();
    accessToken.value = response.accessToken;
    user.value = response.user;
    initialized.value = true;
  }

  async function refresh(): Promise<boolean> {
    if (refreshRequest) return refreshRequest;
    refreshRequest = (async () => {
      try {
        const transport = useAuthTransport();
        const tokens = await runRefreshExclusive(() => transport.refresh());
        accessToken.value = tokens.accessToken;
        user.value = await transport.me(tokens.accessToken);
        return true;
      } catch {
        clearAuthenticatedClientState();
        accessToken.value = undefined;
        user.value = undefined;
        return false;
      } finally {
        initialized.value = true;
        refreshRequest = undefined;
      }
    })();
    return refreshRequest;
  }

  async function initialize(): Promise<void> {
    if (initialized.value) return;
    await refresh();
  }

  async function logout(): Promise<void> {
    await useAuthTransport().logout();
    clearAuthenticatedClientState();
    accessToken.value = undefined;
    user.value = undefined;
    initialized.value = true;
  }

  return {
    accessToken,
    authenticated,
    initialized,
    user,
    establish,
    initialize,
    logout,
    refresh,
  };
});
