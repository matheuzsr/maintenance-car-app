import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '~/services/query-client';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueQueryPlugin, {
    queryClient,
  });
});
