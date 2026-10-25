import DashboardLayout from "@/layouts/DashboardLayout";
import MaintenanceDashboard from "@/features/monitoring/MaintenanceDashboard";

export default function Analytics() {
  return <DashboardLayout><MaintenanceDashboard initialSection="Risk map" initialAnchor="risk-map" /></DashboardLayout>;
}