import { apiRequest } from "./client";
import type { System, SystemCreate, SystemStatus } from "@/types/api";

export function getSystems(token: string): Promise<System[]> {
  return apiRequest("/systems", {}, token);
}

export function getSystem(systemId: string, token: string): Promise<System> {
  return apiRequest(`/systems/${encodeURIComponent(systemId)}`, {}, token);
}

export function createSystem(system: SystemCreate, token: string): Promise<System> {
  return apiRequest("/systems", { method: "POST", body: JSON.stringify(system) }, token);
}

export function updateSystemStatus(systemId: string, status: SystemStatus, token: string): Promise<System> {
  return apiRequest(`/systems/${encodeURIComponent(systemId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, token);
}