import type { ApiErrorResponse } from "@/types/api";

export class ApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}

export class ApiConfigurationError extends ApiError {}

export class ApiNetworkError extends ApiError {}

export class ApiParseError extends ApiError {}

export class ApiHttpError extends ApiError {
  constructor(
    message: string,
    readonly status: number,
    readonly response: ApiErrorResponse,
  ) {
    super(message);
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

function getApiBaseUrl(): string {
  if (!configuredBaseUrl) {
    throw new ApiConfigurationError("VITE_API_BASE_URL is not configured.");
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

function parseErrorResponse(body: string): ApiErrorResponse {
  if (!body) return {};

  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ApiErrorResponse;
    }
  } catch {
    return { message: body };
  }

  return { message: body };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${normalizedPath}`, { ...init, headers });
  } catch (error) {
    throw new ApiNetworkError("Could not reach the API server.", error);
  }

  let body: string;
  try {
    body = await response.text();
  } catch (error) {
    throw new ApiNetworkError("Could not read the API response.", error);
  }

  if (!response.ok) {
    const errorResponse = parseErrorResponse(body);
    throw new ApiHttpError(
      errorResponse.message ?? (typeof errorResponse.detail === "string" ? errorResponse.detail : response.statusText),
      response.status,
      errorResponse,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (body.length === 0) {
    throw new ApiParseError("The API returned an empty response where JSON was expected.");
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new ApiParseError("The API returned invalid JSON.", error);
  }
}

export function toQueryString(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}