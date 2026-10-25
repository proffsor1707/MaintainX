import { apiRequest } from "./client";
import type { ReportExportRequest, ReportExportResponse } from "@/types/api";

export function requestReportExport(request: ReportExportRequest): Promise<ReportExportResponse> {
  return apiRequest("/reports/export", {
    method: "POST",
    body: JSON.stringify(request),
  });
}