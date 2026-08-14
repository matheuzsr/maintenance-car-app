import type { AuthenticatedUser, LoginInput, RegisterInput } from '~/types/api';

/** Refresh credentials live exclusively in the HttpOnly cookie. */
export interface SessionResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export function useAuthTransport() {
  const { public: config } = useRuntimeConfig();
  const options = {
    baseURL: config.apiBaseUrl,
    credentials: 'include' as const,
  };

  return {
    login: (body: LoginInput) =>
      $fetch<SessionResponse>('/api/v1/auth/login', {
        ...options,
        method: 'POST',
        body,
      }),
    register: (body: RegisterInput) =>
      $fetch<SessionResponse>('/api/v1/auth/register', {
        ...options,
        method: 'POST',
        body,
      }),
    refresh: () =>
      $fetch<RefreshResponse>('/api/v1/auth/refresh', {
        ...options,
        method: 'POST',
      }),
    logout: () =>
      $fetch<{ success: true }>('/api/v1/auth/logout', {
        ...options,
        method: 'POST',
      }),
    me: (accessToken: string) =>
      $fetch<AuthenticatedUser>('/api/v1/users/me', {
        ...options,
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
  };
}
