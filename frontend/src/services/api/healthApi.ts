import { apiRequest } from "./client";

export type HealthResponse = { status: string };

export function getApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health", { signal });
}
