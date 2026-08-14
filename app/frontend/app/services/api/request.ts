export async function apiRequest<T>(
  path: string,
  options: Parameters<typeof $fetch>[1] = {},
): Promise<T> {
  const session = useSessionStore();
  const config = useRuntimeConfig();

  const send = () =>
    $fetch<T>(path, {
      ...options,
      baseURL: config.public.apiBaseUrl,
      credentials: 'include',
      headers: {
        ...options.headers,
        ...(session.accessToken
          ? { Authorization: `Bearer ${session.accessToken}` }
          : {}),
      },
    });

  try {
    return await send();
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    if (status !== 401 || !(await session.refresh())) throw error;
    return send();
  }
}
