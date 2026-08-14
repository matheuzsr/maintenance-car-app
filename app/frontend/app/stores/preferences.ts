import { defineStore } from 'pinia';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

const STORAGE_KEY = 'garage-em-dia:theme';

export const usePreferencesStore = defineStore('preferences', () => {
  const theme = ref<ThemePreference>('system');
  const resolvedTheme = ref<ResolvedTheme>('light');
  let mediaQuery: MediaQueryList | undefined;

  function resolveTheme(): ResolvedTheme {
    if (theme.value !== 'system') return theme.value;
    return mediaQuery?.matches ? 'dark' : 'light';
  }

  function applyTheme(): void {
    if (!import.meta.client) return;
    resolvedTheme.value = resolveTheme();
    document.documentElement.dataset.theme = resolvedTheme.value;
    document.documentElement.style.colorScheme = resolvedTheme.value;
  }

  function setTheme(value: ThemePreference): void {
    theme.value = value;
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, value);
    applyTheme();
  }

  function initialize(): void {
    if (!import.meta.client) return;
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      theme.value = saved;
    }
    mediaQuery.addEventListener('change', applyTheme);
    applyTheme();
  }

  function dispose(): void {
    mediaQuery?.removeEventListener('change', applyTheme);
  }

  return { theme, resolvedTheme, initialize, dispose, setTheme };
});
