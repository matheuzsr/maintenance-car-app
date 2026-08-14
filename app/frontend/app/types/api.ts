export interface ApiError {
  message: string;
  status?: number;
  correlationId?: string;
}
