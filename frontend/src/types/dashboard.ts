export type Severity = "critical" | "high" | "medium" | "low";

export type RiskModule = {
  path: string;
  service: string;
  owner: string;
  riskScore: number;
  severity: Severity;
  complexity: number;
  churn: number;
  bugDensity: number;
  lastChanged: string;
  recommendation: string;
};

export type Repository = {
  name: string;
  owner: string;
  branch: string;
  files: string;
  scan: string;
  status: "healthy" | "watch";
};

export type ForecastSprint = {
  sprint: string;
  baseline: number;
  projected: number;
};

export type SeverityMetadata = {
  label: string;
  color: string;
  className: string;
};

export type RecommendedAction = {
  severity: Severity;
  title: string;
  detail: string;
  action: string;
};