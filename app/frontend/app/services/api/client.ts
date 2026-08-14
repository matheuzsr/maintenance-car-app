import type { paths } from '@maintenance-car/api-contract';
import createClient from 'openapi-fetch';

export function useApiClient() {
  const config = useRuntimeConfig();

  return createClient<paths>({
    baseUrl: config.public.apiBaseUrl,
    credentials: 'include',
  });
}
