export default defineNuxtRouteMiddleware(async () => {
  const session = useSessionStore();
  await session.initialize();
  if (!session.authenticated) return navigateTo('/login');
});
