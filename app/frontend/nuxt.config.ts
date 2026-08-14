import { z } from 'zod';
import tailwindcss from '@tailwindcss/vite';

const environment = z
  .object({
    NUXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3000'),
  })
  .parse(process.env);

export default defineNuxtConfig({
  compatibilityDate: '2026-08-14',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/i18n', '@pinia/nuxt'],
  ssr: false,
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBaseUrl: environment.NUXT_PUBLIC_API_BASE_URL,
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
});
