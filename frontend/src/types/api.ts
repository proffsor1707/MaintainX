export type SystemStatus = "healthy" | "watch" | "offline";
export type MetricKind = "cpu_usage" | "memory_usage" | "response_time_ms" | "error_rate" | "request_volume";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "investigating" | "resolved";

export type ApiErrorResponse = {
  code?: string;
  message?: string;
  detail?: string | Record<string, unknown> | unknown[];
  requestId?: string;
};

export type PredictionRequest = {
  cpu_usage: number | null;
  memory_usage: number | null;
  response_time_ms: number | null;
  error_rate: number | null;
  request_volume: number | null;
  historical_incidents_30d: number;
  system_id?: string;
};

export type PredictionResponse = {
  failure_probability: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  model_version: string;
  model_name: string;
  dataset_is_synthetic: boolean;
  generated_at: string;
  system_id?: string | null;
};

export type Incident = {
  id: string;
  system_id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IncidentQuery = {
  system_id?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  limit?: number;
  offset?: number;
};

export type System = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: SystemStatus;
  created_at: string;
  updated_at: string;
};

export type SystemCreate = Pick<System, "name" | "slug"> & { description?: string | null };
export type Metric = {
  id: string;
  system_id: string;
  name: MetricKind;
  value: number;
  unit: string | null;
  recorded_at: string;
  created_at: string;
};

export type MetricCreate = Pick<Metric, "name" | "value"> & {
  unit?: string | null;
  recorded_at?: string;
};

export type Recommendation = {
  code: string;
  message: string;
};

export type RecommendationsResponse = {
  system_id: string;
  prediction_id: string;
  failure_probability: number;
  severity: IncidentSeverity;
  risk_level: PredictionResponse["risk_level"];
  generated_at: string;
  recommendations: Recommendation[];
};

export type IncidentCreate = Pick<Incident, "system_id" | "title" | "severity"> & {
  description?: string | null;
  status?: IncidentStatus;
  occurred_at?: string;
};

export type ReportExportRequest = {
  format: "csv" | "pdf";
  from?: string;
  to?: string;
  systemId?: string;
};

export type ReportExportResponse = {
  downloadUrl: string;
  fileName: string;
  expiresAt?: string;
};