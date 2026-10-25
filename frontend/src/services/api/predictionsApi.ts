import { apiRequest, toQueryString } from "./client";
import type { PredictionRequest, PredictionResponse } from "@/types/api";

export function requestPrediction(prediction: PredictionRequest, token: string): Promise<PredictionResponse> {
  return apiRequest("/predictions", { method: "POST", body: JSON.stringify(prediction) }, token);
}