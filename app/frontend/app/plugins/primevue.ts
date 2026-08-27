import PrimeVue from 'primevue/config';

export default defineNuxtPlugin((nuxtApp) => {
  const license = useRuntimeConfig().public.primeUiLicenseKey;

  nuxtApp.vueApp.use(PrimeVue, {
    unstyled: true,
    ripple: false,
    license: license || undefined,
  });
});
