<script setup lang="ts">
definePageMeta({ layout: 'public' });
const { t } = useI18n();
useHead({ title: computed(() => t('logout.metaTitle')) });
const submitting = ref(false);
const error = ref('');

async function logout(): Promise<void> {
  submitting.value = true;
  error.value = '';
  try {
    const result = await useSessionStore().logout();
    await navigateTo(
      result.pushCleanupSucceeded ? '/login' : '/login?pushCleanup=failed',
      { replace: true },
    );
  } catch {
    error.value = t('logout.error');
  } finally {
    submitting.value = false;
  }
}

onMounted(logout);
</script>
<template>
  <section class="entity-form narrow" aria-live="polite">
    <p v-if="submitting" role="status">{{ t('logout.progress') }}</p>
    <template v-else-if="error">
      <p class="form-error" role="alert">{{ error }}</p>
      <AppButton type="button" @click="logout">{{
        t('logout.tryAgain')
      }}</AppButton>
      <NuxtLink to="/">{{ t('logout.back') }}</NuxtLink>
    </template>
  </section>
</template>
