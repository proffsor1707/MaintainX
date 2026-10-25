import { apiRequest, toQueryString } from "./client";
import type { Incident, IncidentCreate, IncidentQuery, IncidentStatus, IncidentSeverity } from "@/types/api";

export function getIncidents(query: IncidentQuery, token: string): Promise<Incident[]> {
  return apiRequest(`/incidents${toQueryString(query)}`, {}, token);
}

export function createIncident(incident: IncidentCreate, token: string): Promise<Incident> {
  return apiRequest("/incidents", { method: "POST", body: JSON.stringify(incident) }, token);
}

export function getIncident(incidentId: string, token: string): Promise<Incident> {
  return apiRequest(`/incidents/${encodeURIComponent(incidentId)}`, {}, token);
}

export function updateIncident(
  incidentId: string,
  update: { title?: string; description?: string | null; severity?: IncidentSeverity; status?: IncidentStatus },
  token: string,
): Promise<Incident> {
  return apiRequest(`/incidents/${encodeURIComponent(incidentId)}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  }, token);
}