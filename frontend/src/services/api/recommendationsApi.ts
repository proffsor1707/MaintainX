import { apiRequest } from "./client";
import type { RecommendationsResponse } from "@/types/api";

export function getSystemRecommendations(systemId: string, token: string): Promise<RecommendationsResponse> {
  return apiRequest(`/recommendations/${encodeURIComponent(systemId)}`, {}, token);
}