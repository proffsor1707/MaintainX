import DashboardLayout from "@/layouts/DashboardLayout";
import MaintenanceDashboard from "@/features/monitoring/MaintenanceDashboard";

export default function Predictions() {
  return <DashboardLayout><MaintenanceDashboard initialSection="Activity" initialAnchor="activity" /></DashboardLayout>;
}