import { z } from 'zod';
import tailwindcss from '@tailwindcss/vite';

const environment = z
  .object({
    NUXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3000'),
    NUXT_PUBLIC_PRIMEUI_LICENSE_KEY: z.string().default(''),
  })
  .parse(process.env);

export default defineNuxtConfig({
  compatibilityDate: '2026-08-14',
  devtools: { enabled: true },
  components: [{ path: '~/components', pathPrefix: false }],
  modules: ['@nuxt/eslint', '@nuxtjs/i18n', '@pinia/nuxt', '@vite-pwa/nuxt'],
  ssr: false,
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBaseUrl: environment.NUXT_PUBLIC_API_BASE_URL,
      primeUiLicenseKey: environment.NUXT_PUBLIC_PRIMEUI_LICENSE_KEY,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  i18n: {
    defaultLocale: 'pt-BR',
    strategy: 'no_prefix',
    locales: [
      {
        code: 'pt-BR',
        language: 'pt-BR',
        file: 'pt-BR.json',
        name: 'Português (Brasil)',
      },
    ],
  },
  pwa: {
    strategies: 'injectManifest',
    srcDir: '../service-worker',
    filename: 'sw.ts',
    registerType: 'prompt',
    injectRegister: 'auto',
    includeAssets: [
      'icons/app-icon.svg',
      'icons/pwa-64x64.png',
      'icons/notification-badge-96x96.png',
      'icons/apple-touch-icon-180x180.png',
    ],
    manifest: {
      id: '/',
      name: 'Garagem em Dia',
      short_name: 'Garagem',
      description: 'Histórico, agenda e custos de manutenção veicular.',
      lang: 'pt-BR',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#f3efea',
      theme_color: '#6f1d2b',
      categories: ['automotive', 'utilities'],
      icons: [
        {
          src: '/icons/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Notificações',
          short_name: 'Alertas',
          url: '/notifications',
        },
      ],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
      maximumFileSizeToCacheInBytes: 3_000_000,
    },
    client: {
      installPrompt: 'garage-em-dia:hide-install',
      periodicSyncForUpdates: 3600,
    },
    devOptions: {
      enabled: false,
    },
  },
});
