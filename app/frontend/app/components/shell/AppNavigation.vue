<script setup lang="ts">
import {
  CalendarClock,
  CirclePlus,
  Gauge,
  History,
  LayoutGrid,
  MoreHorizontal,
  ChartNoAxesColumnIncreasing,
  Shapes,
  CarFront,
  LogOut,
  Bell,
  Settings,
} from 'lucide-vue-next';

withDefaults(defineProps<{ mobile?: boolean }>(), { mobile: false });
defineEmits<{ create: [] }>();
const { t } = useI18n();
const selection = useVehicleSelectionStore();

const links = computed(() => [
  { to: '/', label: t('navigation.dashboard'), icon: Gauge },
  { to: '/vehicles', label: t('navigation.vehicles'), icon: CarFront },
  {
    to: selection.selectedId
      ? `/vehicles/${selection.selectedId}/agenda`
      : '/vehicles',
    label: t('navigation.agenda'),
    icon: CalendarClock,
  },
  {
    to: selection.selectedId
      ? `/vehicles/${selection.selectedId}/history`
      : '/vehicles',
    label: t('navigation.history'),
    icon: History,
  },
  {
    to: '/reports',
    label: t('navigation.reports'),
    icon: ChartNoAxesColumnIncreasing,
  },
  { to: '/componentes', label: t('navigation.components'), icon: Shapes },
  { to: '/notifications', label: t('navigation.notifications'), icon: Bell },
  {
    to: '/settings/notifications',
    label: t('navigation.settings'),
    icon: Settings,
  },
  { to: '/logout', label: t('navigation.logout'), icon: LogOut },
]);
const mobilePrimaryLinks = computed(() =>
  links.value.filter((_, index) => index === 0 || index === 2),
);
</script>

<template>
  <nav
    :class="mobile ? 'mobile-navigation' : 'desktop-navigation'"
    :aria-label="
      t(mobile ? 'navigation.mobileLabel' : 'navigation.desktopLabel')
    "
  >
    <template v-if="mobile">
      <NuxtLink
        v-for="link in mobilePrimaryLinks"
        :key="link.to"
        :to="link.to"
        class="navigation-link"
      >
        <component
          :is="link.icon"
          :size="21"
          :stroke-width="1.75"
          aria-hidden="true"
        />
        <span>{{ link.label }}</span>
      </NuxtLink>
      <button
        class="mobile-create"
        type="button"
        :aria-label="t('navigation.add')"
        @click="$emit('create')"
      >
        <CirclePlus :size="25" :stroke-width="1.75" aria-hidden="true" />
        <span>{{ t('navigation.add') }}</span>
      </button>
      <NuxtLink :to="links[3]!.to" class="navigation-link">
        <History :size="21" :stroke-width="1.75" aria-hidden="true" />
        <span>{{ links[3]!.label }}</span>
      </NuxtLink>
      <NuxtLink to="/notifications" class="navigation-link">
        <MoreHorizontal :size="21" :stroke-width="1.75" aria-hidden="true" />
        <span>{{ t('navigation.more') }}</span>
      </NuxtLink>
    </template>
    <template v-else>
      <button class="desktop-create" type="button" @click="$emit('create')">
        <LayoutGrid :size="20" :stroke-width="1.75" aria-hidden="true" />
        <span>{{ t('navigation.quickAction') }}</span>
      </button>
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="navigation-link"
      >
        <component
          :is="link.icon"
          :size="20"
          :stroke-width="1.75"
          aria-hidden="true"
        />
        <span>{{ link.label }}</span>
      </NuxtLink>
    </template>
  </nav>
</template>

<style scoped>
.desktop-navigation {
  display: grid;
  gap: 0.25rem;
}

.navigation-link,
.desktop-create {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-left: 0.1875rem solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 640;
  text-align: left;
  text-decoration: none;
}

.navigation-link:hover,
.desktop-create:hover {
  color: var(--text);
  background: var(--surface-muted);
}

.navigation-link.router-link-active {
  color: var(--primary);
  background: var(--primary-soft);
  border-left-color: var(--primary);
}

.desktop-create {
  width: 100%;
  margin-bottom: 1rem;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  border-radius: 0;
}

.mobile-navigation {
  min-height: var(--bottom-nav-height);
  display: none;
  grid-template-columns: repeat(5, 1fr);
  padding: 0.375rem max(0.25rem, env(safe-area-inset-right))
    max(0.375rem, env(safe-area-inset-bottom))
    max(0.25rem, env(safe-area-inset-left));
  background: var(--surface-raised);
  border-top: 1px solid var(--border);
}

.mobile-navigation .navigation-link,
.mobile-create {
  min-width: 0;
  min-height: 3.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.25rem;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 0.6875rem;
  text-decoration: none;
}

.mobile-navigation .navigation-link.router-link-active,
.mobile-create {
  color: var(--primary);
}

@media (max-width: 63.99rem) {
  .mobile-navigation {
    display: grid;
  }
}
</style>
