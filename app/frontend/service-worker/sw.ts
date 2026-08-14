/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { warmStrategyCache } from 'workbox-recipes';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

interface MaintenancePushPayload {
  notificationId?: unknown;
  vehicleId?: unknown;
  title?: unknown;
  body?: unknown;
  reason?: unknown;
  severity?: unknown;
}

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

const navigationStrategy = new NetworkFirst({
  cacheName: 'garage-em-dia-shell',
  networkTimeoutSeconds: 4,
});

warmStrategyCache({ urls: ['/'], strategy: navigationStrategy });

registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith('/api/'),
  navigationStrategy,
);

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await caches.match('/')) ?? Response.error();
  }
  return Response.error();
});

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deepLink(payload: MaintenancePushPayload): string {
  if (
    typeof payload.vehicleId !== 'string' ||
    !UUID_PATTERN.test(payload.vehicleId) ||
    typeof payload.notificationId !== 'string' ||
    !UUID_PATTERN.test(payload.notificationId)
  ) {
    return '/notifications';
  }
  return `/vehicles/${encodeURIComponent(payload.vehicleId)}/agenda?notification=${encodeURIComponent(payload.notificationId)}`;
}

self.addEventListener('push', (event) => {
  let payload: MaintenancePushPayload = {};
  try {
    const candidate: unknown = event.data?.json();
    if (candidate && typeof candidate === 'object') {
      payload = candidate as MaintenancePushPayload;
    }
  } catch {
    // Invalid payloads use the privacy-safe empty notification fallback.
  }

  const title =
    typeof payload.title === 'string' ? payload.title : 'Garagem em Dia';
  const body =
    typeof payload.body === 'string'
      ? payload.body
      : typeof payload.reason === 'string'
        ? payload.reason
        : '';
  const notificationId =
    typeof payload.notificationId === 'string'
      ? payload.notificationId
      : undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/pwa-192x192.png',
      badge: '/icons/notification-badge-96x96.png',
      tag: notificationId ? `maintenance-${notificationId}` : undefined,
      renotify: Boolean(notificationId),
      data: {
        notificationId:
          typeof payload.notificationId === 'string'
            ? payload.notificationId
            : undefined,
        vehicleId:
          typeof payload.vehicleId === 'string' ? payload.vehicleId : undefined,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification.data ?? {}) as MaintenancePushPayload;
  const targetUrl = new URL(deepLink(data), self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clients) => {
        const visible = clients.find(
          (client): client is WindowClient => 'focus' in client,
        );
        if (visible) {
          await visible.navigate(targetUrl);
          return visible.focus();
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});
