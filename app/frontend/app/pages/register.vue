<script setup lang="ts">
definePageMeta({ layout: 'public', middleware: 'guest' });
const { t } = useI18n();
useHead({ title: computed(() => t('register.metaTitle')) });
const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);
async function submit(): Promise<void> {
  if (password.value.length < 12) {
    error.value = t('register.passwordError');
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    await useSessionStore().establish('register', {
      name: name.value,
      email: email.value,
      password: password.value,
    });
    await navigateTo('/vehicles/new');
  } catch {
    error.value = t('register.error');
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <section class="auth-panel" aria-labelledby="register-title">
    <div>
      <p class="eyebrow">{{ t('register.eyebrow') }}</p>
      <h1 id="register-title">{{ t('register.title') }}</h1>
      <p>{{ t('register.description') }}</p>
    </div>
    <form class="entity-form" @submit.prevent="submit">
      <AppInput
        id="name"
        v-model="name"
        autocomplete="name"
        :label="t('register.name')"
      />
      <AppInput
        id="register-email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="t('login.email')"
      />
      <AppInput
        id="register-password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        :label="t('login.password')"
        :hint="t('register.passwordHint')"
      />
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <AppButton block type="submit" :loading="submitting">{{
        t('register.action')
      }}</AppButton>
      <p>
        {{ t('register.hasAccount') }}
        <NuxtLink to="/login">{{ t('register.login') }}</NuxtLink>
      </p>
    </form>
  </section>
</template>
<style scoped>
.auth-panel {
  width: min(100%, 56rem);
  display: grid;
  grid-template-columns: 1fr minmax(18rem, 0.8fr);
  gap: clamp(2rem, 8vw, 6rem);
  align-items: center;
}
.auth-panel h1 {
  margin: 0.5rem 0;
  font-size: clamp(2.25rem, 6vw, 4rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
}
.auth-panel > div > p:last-child {
  color: var(--text-muted);
}
@media (max-width: 42rem) {
  .auth-panel {
    grid-template-columns: 1fr;
  }
}
</style>
