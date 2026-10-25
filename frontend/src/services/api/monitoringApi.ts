import { apiRequest, toQueryString } from "./client";
import type { Metric, MetricCreate, MetricKind } from "@/types/api";

export function getSystemMetrics(
  systemId: string,
  token: string,
  filters: { name?: MetricKind; limit?: number; offset?: number } = {},
): Promise<Metric[]> {
  const query = toQueryString({
    name: filters.name,
    limit: filters.limit === undefined ? undefined : String(filters.limit),
    offset: filters.offset === undefined ? undefined : String(filters.offset),
  });
  return apiRequest(`/monitoring/systems/${encodeURIComponent(systemId)}/metrics${query}`, {}, token);
}

export function recordSystemMetric(systemId: string, metric: MetricCreate, token: string): Promise<Metric> {
  return apiRequest(`/monitoring/systems/${encodeURIComponent(systemId)}/metrics`, {
    method: "POST",
    body: JSON.stringify(metric),
  }, token);
}