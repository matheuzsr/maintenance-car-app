<script setup lang="ts">
const { t } = useI18n();
useHead({ title: computed(() => t('gallery.metaTitle')) });
const name = ref('');
const category = ref('preventive');
const dialogOpen = ref(false);
const viewState = ref<'empty' | 'loading' | 'error'>('empty');
const categoryOptions = computed(() => [
  { value: 'preventive', label: t('gallery.fields.options.preventive') },
  { value: 'corrective', label: t('gallery.fields.options.corrective') },
]);
</script>

<template>
  <div class="gallery-page">
    <header class="gallery-heading">
      <p class="eyebrow">{{ t('gallery.eyebrow') }}</p>
      <h1>{{ t('gallery.title') }}</h1>
      <p>{{ t('gallery.description') }}</p>
    </header>

    <section aria-labelledby="actions-title" class="gallery-section">
      <div class="gallery-section__heading">
        <span>01</span>
        <div>
          <h2 id="actions-title">{{ t('gallery.actions.title') }}</h2>
          <p>{{ t('gallery.actions.description') }}</p>
        </div>
      </div>
      <div class="gallery-stage gallery-stage--row">
        <AppButton>{{ t('actions.save') }}</AppButton>
        <AppButton variant="secondary">{{ t('actions.cancel') }}</AppButton>
        <AppButton variant="quiet">{{ t('actions.seeDetails') }}</AppButton>
        <AppButton variant="danger">{{ t('actions.delete') }}</AppButton>
        <AppButton loading>{{ t('actions.saving') }}</AppButton>
        <AppButton disabled>{{ t('actions.disabled') }}</AppButton>
      </div>
    </section>

    <section aria-labelledby="fields-title" class="gallery-section">
      <div class="gallery-section__heading">
        <span>02</span>
        <div>
          <h2 id="fields-title">{{ t('gallery.fields.title') }}</h2>
          <p>{{ t('gallery.fields.description') }}</p>
        </div>
      </div>
      <div class="gallery-stage gallery-stage--fields">
        <AppInput
          id="plan-name"
          v-model="name"
          :label="t('gallery.fields.name')"
          :placeholder="t('gallery.fields.placeholder')"
          :hint="t('gallery.fields.hint')"
        />
        <AppInput
          id="invalid-odometer"
          :label="t('gallery.fields.odometer')"
          model-value="82.100"
          :error="t('gallery.fields.error')"
        />
        <AppSelect
          id="maintenance-category"
          v-model="category"
          :label="t('gallery.fields.category')"
          :options="categoryOptions"
        />
      </div>
    </section>

    <section aria-labelledby="status-title" class="gallery-section">
      <div class="gallery-section__heading">
        <span>03</span>
        <div>
          <h2 id="status-title">{{ t('gallery.status.title') }}</h2>
          <p>{{ t('gallery.status.description') }}</p>
        </div>
      </div>
      <div class="gallery-stage gallery-stage--row">
        <AppStatusBadge :label="t('gallery.status.ok')" status="success" />
        <AppStatusBadge :label="t('gallery.status.soon')" status="warning" />
        <AppStatusBadge :label="t('gallery.status.overdue')" status="danger" />
        <AppStatusBadge :label="t('gallery.status.scheduled')" status="info" />
      </div>
    </section>

    <section aria-labelledby="states-title" class="gallery-section">
      <div class="gallery-section__heading">
        <span>04</span>
        <div>
          <h2 id="states-title">{{ t('gallery.states.title') }}</h2>
          <p>{{ t('gallery.states.description') }}</p>
        </div>
      </div>
      <div
        class="state-switcher"
        role="group"
        :aria-label="t('gallery.states.switcherLabel')"
      >
        <AppButton
          v-for="state in ['empty', 'loading', 'error'] as const"
          :key="state"
          :variant="viewState === state ? 'primary' : 'secondary'"
          @click="viewState = state"
          >{{ t(`gallery.states.${state}`) }}</AppButton
        >
      </div>
      <div class="gallery-stage">
        <AppEmptyState
          v-if="viewState === 'empty'"
          :title="t('states.empty.title')"
          :description="t('states.empty.description')"
          :action-label="t('states.empty.action')"
        />
        <AppSkeleton
          v-else-if="viewState === 'loading'"
          :label="t('states.loading')"
          :lines="4"
        />
        <AppErrorState
          v-else
          :title="t('states.error.title')"
          :description="t('states.error.description')"
          :retry-label="t('actions.tryAgain')"
        />
      </div>
    </section>

    <section aria-labelledby="dialog-title" class="gallery-section">
      <div class="gallery-section__heading">
        <span>05</span>
        <div>
          <h2 id="dialog-title">{{ t('gallery.dialog.title') }}</h2>
          <p>{{ t('gallery.dialog.description') }}</p>
        </div>
      </div>
      <div class="gallery-stage">
        <AppButton variant="secondary" @click="dialogOpen = true">{{
          t('gallery.dialog.open')
        }}</AppButton>
      </div>
      <AppDialog
        v-model="dialogOpen"
        :title="t('gallery.dialog.sampleTitle')"
        :close-label="t('actions.close')"
      >
        <p class="dialog-copy">{{ t('gallery.dialog.sampleDescription') }}</p>
        <template #footer
          ><div class="dialog-actions">
            <AppButton variant="quiet" @click="dialogOpen = false">{{
              t('actions.cancel')
            }}</AppButton
            ><AppButton @click="dialogOpen = false">{{
              t('actions.confirm')
            }}</AppButton>
          </div></template
        >
      </AppDialog>
    </section>
  </div>
</template>

<style scoped>
.gallery-page {
  display: grid;
  gap: 3rem;
  padding-bottom: 4rem;
}
.gallery-heading {
  max-width: 44rem;
}
.eyebrow {
  margin: 0;
  color: var(--primary);
  font-size: 0.7rem;
  font-weight: 780;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.gallery-heading h1 {
  margin: 0.25rem 0 0.5rem;
  font-size: clamp(2rem, 5vw, 3.2rem);
  letter-spacing: -0.045em;
}
.gallery-heading > p:last-child,
.gallery-section__heading p {
  margin: 0;
  color: var(--text-muted);
}
.gallery-section {
  display: grid;
  grid-template-columns: minmax(15rem, 0.55fr) minmax(20rem, 1.45fr);
  gap: clamp(1.5rem, 5vw, 5rem);
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}
.gallery-section__heading {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
}
.gallery-section__heading > span {
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  font-weight: 780;
}
.gallery-section__heading h2 {
  margin: 0 0 0.3rem;
  font-size: 1rem;
}
.gallery-section__heading p {
  font-size: 0.875rem;
}
.gallery-stage {
  min-width: 0;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.gallery-stage--row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.gallery-stage--fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}
.gallery-stage--fields > :last-child {
  grid-column: 1 / -1;
}
.state-switcher {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: -2.25rem;
  transform: translateY(-3rem);
  justify-self: end;
}
.dialog-copy {
  color: var(--text-muted);
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
@media (max-width: 48rem) {
  .gallery-section {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .gallery-stage--fields {
    grid-template-columns: 1fr;
  }
  .gallery-stage--fields > :last-child {
    grid-column: auto;
  }
  .state-switcher {
    grid-column: auto;
    justify-self: start;
    margin: 0;
    transform: none;
  }
}
</style>
