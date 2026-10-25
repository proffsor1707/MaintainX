import type {
  ForecastSprint,
  RecommendedAction,
  Repository,
  RiskModule,
  Severity,
  SeverityMetadata,
} from "@/types/dashboard";

export const repositories: Repository[] = [
  { name: "atlas-platform", owner: "northstar-labs", branch: "main", files: "1,284", scan: "12 min ago", status: "healthy" },
  { name: "checkout-service", owner: "northstar-labs", branch: "release/2.8", files: "438", scan: "2 hrs ago", status: "watch" },
  { name: "mobile-shell", owner: "northstar-labs", branch: "develop", files: "892", scan: "Yesterday", status: "healthy" },
];

export const initialModules: RiskModule[] = [
  { path: "src/billing/retry-policy.ts", service: "billing", owner: "Lena Ortiz", riskScore: 91, severity: "critical", complexity: 28, churn: 67, bugDensity: 8.4, lastChanged: "18 min ago", recommendation: "Split retry state machine before next release" },
  { path: "src/auth/session-store.ts", service: "identity", owner: "Marcus Chen", riskScore: 84, severity: "high", complexity: 22, churn: 48, bugDensity: 6.1, lastChanged: "2 hrs ago", recommendation: "Add expiry boundary tests and reduce branching" },
  { path: "src/search/query-planner.ts", service: "discovery", owner: "Priya Shah", riskScore: 76, severity: "high", complexity: 19, churn: 42, bugDensity: 4.7, lastChanged: "4 hrs ago", recommendation: "Extract ranking heuristics into isolated module" },
  { path: "src/notifications/delivery.ts", service: "messaging", owner: "Noah Williams", riskScore: 63, severity: "medium", complexity: 15, churn: 31, bugDensity: 3.8, lastChanged: "Yesterday", recommendation: "Instrument provider timeout paths" },
  { path: "src/checkout/tax-calculator.ts", service: "checkout", owner: "Lena Ortiz", riskScore: 58, severity: "medium", complexity: 13, churn: 27, bugDensity: 2.9, lastChanged: "Yesterday", recommendation: "Consolidate regional rule branches" },
  { path: "src/catalog/variant-index.ts", service: "catalog", owner: "Eli Grant", riskScore: 41, severity: "low", complexity: 8, churn: 19, bugDensity: 1.8, lastChanged: "3 days ago", recommendation: "Add a benchmark for high-cardinality SKUs" },
  { path: "src/analytics/event-buffer.ts", service: "observability", owner: "Ava Patel", riskScore: 27, severity: "low", complexity: 6, churn: 11, bugDensity: 0.9, lastChanged: "5 days ago", recommendation: "No action required" },
];

export const forecast: ForecastSprint[] = [
  { sprint: "S-19", baseline: 42, projected: 48 },
  { sprint: "S-20", baseline: 45, projected: 53 },
  { sprint: "S-21", baseline: 47, projected: 57 },
  { sprint: "S-22", baseline: 44, projected: 63 },
  { sprint: "S-23", baseline: 46, projected: 69 },
  { sprint: "S-24", baseline: 48, projected: 72 },
];

export const severityMeta: Record<Severity, SeverityMetadata> = {
  critical: { label: "Critical", color: "#ff6d6d", className: "critical" },
  high: { label: "High", color: "#ffad66", className: "high" },
  medium: { label: "Medium", color: "#e7d96f", className: "medium" },
  low: { label: "Low", color: "#6fd4ad", className: "low" },
};

export const dashboardMetrics = {
  systemHealth: 82,
  healthTrend: "4.6%",
  monitoredFiles: "1,284",
  newFiles: "+38 since last scan",
  openFindings: 12,
  findingsTrend: "8.3%",
  findingCounts: { critical: 2, high: 4, medium: 6 },
  findingBarWidths: { critical: "17%", high: "33%", medium: "50%" },
  estimatedMaintenanceHours: "48.5",
  nextSprints: 2,
  maintenanceDelta: "+6.2 hrs",
  capacityUsed: 64,
  forecastIncreaseHours: 24,
  modelRefresh: "12 minutes ago",
  riskTrendServices: ["billing", "identity"],
};

export const recommendedActions: RecommendedAction[] = [
  { severity: "critical", title: "Untangle retry state machine", detail: "billing/retry-policy.ts · 8.4 bug density", action: "Review file" },
  { severity: "high", title: "Add session expiry tests", detail: "auth/session-store.ts · 22 cyclomatic", action: "Assign owner" },
  { severity: "medium", title: "Instrument timeout paths", detail: "notifications/delivery.ts · 31% churn", action: "Create task" },
];