<script setup lang="ts">
definePageMeta({ layout: 'public' });
const { t } = useI18n();
useHead({ title: computed(() => t('login.metaTitle')) });
const email = ref('');
const password = ref('');
</script>

<template>
  <section class="login-panel" aria-labelledby="login-title">
    <div class="login-intro">
      <p>{{ t('login.eyebrow') }}</p>
      <h1 id="login-title">{{ t('login.title') }}</h1>
      <span>{{ t('login.description') }}</span>
    </div>
    <form @submit.prevent>
      <AppInput
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="t('login.email')"
        :placeholder="t('login.emailPlaceholder')"
      />
      <AppInput
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        :label="t('login.password')"
      />
      <AppButton block disabled type="submit">{{
        t('login.action')
      }}</AppButton>
      <p role="note">{{ t('login.futureHint') }}</p>
    </form>
  </section>
</template>

<style scoped>
.login-panel {
  width: min(100%, 56rem);
  display: grid;
  grid-template-columns: 1fr minmax(18rem, 0.8fr);
  gap: clamp(2rem, 8vw, 6rem);
  align-items: center;
}
.login-intro > p {
  margin: 0;
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 780;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
h1 {
  margin: 0.5rem 0;
  font-size: clamp(2.25rem, 6vw, 4rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
}
.login-intro span {
  color: var(--text-muted);
}
form {
  display: grid;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 2rem);
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 0.25rem solid var(--primary);
  box-shadow: var(--shadow);
}
form p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
}
@media (max-width: 42rem) {
  .login-panel {
    grid-template-columns: 1fr;
  }
}
</style>
