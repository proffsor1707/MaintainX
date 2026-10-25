import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, ApiHttpError } from "@/services/api/client";
import { getIncidents } from "@/services/api/incidentsApi";
import { getSystemMetrics } from "@/services/api/monitoringApi";
import { requestPrediction } from "@/services/api/predictionsApi";
import { getSystemRecommendations } from "@/services/api/recommendationsApi";
import { getSystems } from "@/services/api/systemsApi";
import type { Incident, Metric, MetricKind, PredictionResponse, RecommendationsResponse, System } from "@/types/api";

export type DashboardApiMode = "loading" | "live" | "demo" | "error";

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Could not load live dashboard data.";
}

function latestMetricValues(metrics: Metric[]): Partial<Record<MetricKind, number>> {
  const newest = new Map<MetricKind, Metric>();
  for (const metric of [...metrics].sort((left, right) => Date.parse(right.recorded_at) - Date.parse(left.recorded_at))) {
    if (!newest.has(metric.name)) newest.set(metric.name, metric);
  }
  return Object.fromEntries([...newest].map(([name, metric]) => [name, metric.value]));
}

export function useDashboardApiData() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [systems, setSystems] = useState<System[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [mode, setMode] = useState<DashboardApiMode>("loading");
  const [error, setError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const selectedSystem = systems.find((system) => system.id === selectedSystemId) ?? null;
  const metricValues = useMemo(() => latestMetricValues(metrics), [metrics]);
  const openIncidents = useMemo(() => incidents.filter((incident) => incident.status !== "resolved"), [incidents]);
  const incidentCounts = useMemo(() => ({
    critical: openIncidents.filter((incident) => incident.severity === "critical").length,
    high: openIncidents.filter((incident) => incident.severity === "high").length,
    medium: openIncidents.filter((incident) => incident.severity === "medium").length,
    low: openIncidents.filter((incident) => incident.severity === "low").length,
  }), [openIncidents]);

  const refresh = useCallback(async () => {
    if (!isLoaded) {
      setMode("loading");
      return;
    }
    if (!isSignedIn) {
      setMode("demo");
      setSystems([]);
      setSelectedSystemId(null);
      setMetrics([]);
      setIncidents([]);
      setRecommendations(null);
      return;
    }

    setMode("loading");
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Clerk session token is unavailable.");

      const systemList = await getSystems(token);
      setSystems(systemList);
      if (systemList.length === 0) {
        setSelectedSystemId(null);
        setMetrics([]);
        setIncidents([]);
        setRecommendations(null);
        setMode("demo");
        setError("No systems are configured yet. Showing sample dashboard data.");
        return;
      }

      const systemId = systemList.some((system) => system.id === selectedSystemId)
        ? selectedSystemId!
        : systemList[0].id;
      setSelectedSystemId(systemId);

      const [systemMetrics, systemIncidents] = await Promise.all([
        getSystemMetrics(systemId, token, { limit: 500 }),
        getIncidents({ system_id: systemId, limit: 500 }, token),
      ]);
      setMetrics(systemMetrics);
      setIncidents(systemIncidents);
      try {
        setRecommendations(await getSystemRecommendations(systemId, token));
      } catch (recommendationError) {
        if (!(recommendationError instanceof ApiHttpError) || recommendationError.status !== 404) {
          throw recommendationError;
        }
        setRecommendations(null);
      }
      setMode("live");
    } catch (loadError) {
      setMode("error");
      setError(getErrorMessage(loadError));
      setSystems([]);
      setSelectedSystemId(null);
      setMetrics([]);
      setIncidents([]);
      setRecommendations(null);
    }
  }, [getToken, isLoaded, isSignedIn, selectedSystemId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runPrediction = useCallback(async (): Promise<PredictionResponse> => {
    if (mode !== "live" || selectedSystemId === null) {
      throw new Error("Live system data is not available for prediction.");
    }

    const requiredMetrics: MetricKind[] = ["cpu_usage", "memory_usage", "response_time_ms", "error_rate", "request_volume"];
    const missingMetrics = requiredMetrics.filter((name) => metricValues[name] === undefined);
    if (missingMetrics.length > 0) {
      throw new Error(`Prediction needs current metrics: ${missingMetrics.join(", ")}.`);
    }

    setIsPredicting(true);
    setPredictionError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Clerk session token is unavailable.");
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recentIncidentCount = incidents.filter((incident) => Date.parse(incident.occurred_at) >= cutoff).length;
      const result = await requestPrediction({
        cpu_usage: metricValues.cpu_usage!,
        memory_usage: metricValues.memory_usage!,
        response_time_ms: metricValues.response_time_ms!,
        error_rate: metricValues.error_rate!,
        request_volume: metricValues.request_volume!,
        historical_incidents_30d: recentIncidentCount,
        system_id: selectedSystemId,
      }, token);
      setPrediction(result);
      try {
        setRecommendations(await getSystemRecommendations(selectedSystemId, token));
      } catch (recommendationError) {
        if (!(recommendationError instanceof ApiHttpError) || recommendationError.status !== 404) {
          throw recommendationError;
        }
        setRecommendations(null);
      }
      return result;
    } catch (requestError) {
      setPredictionError(getErrorMessage(requestError));
      throw requestError;
    } finally {
      setIsPredicting(false);
    }
  }, [getToken, incidents, metricValues, mode, selectedSystemId]);

  return {
    systems,
    selectedSystem,
    selectedSystemId,
    setSelectedSystemId,
    metrics,
    metricValues,
    incidents,
    openIncidents,
    incidentCounts,
    prediction,
    recommendations,
    mode,
    error,
    predictionError,
    isPredicting,
    refresh,
    runPrediction,
  };
}