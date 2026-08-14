import { normalizeApiError } from './errors';
import { useApiClient } from './client';

export async function getApiHealth(): Promise<{ status: string }> {
  const client = useApiClient();
  const { data, error, response } = await client.GET('/api/v1/health/live');

  if (error || !data) {
    throw normalizeApiError(error, response);
  }

  return data;
}
