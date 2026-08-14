import type { ApiError } from '~/types/api';

const fallbackMessage = 'Não foi possível concluir a comunicação com a API.';

export function normalizeApiError(
  error: unknown,
  response?: Response,
): ApiError {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const correlationId = response?.headers.get('x-correlation-id') ?? undefined;

  return {
    message,
    ...(response ? { status: response.status } : {}),
    ...(correlationId ? { correlationId } : {}),
  };
}
