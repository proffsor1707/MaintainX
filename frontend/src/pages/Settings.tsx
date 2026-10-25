import DashboardLayout from "@/layouts/DashboardLayout";
import MaintenanceDashboard from "@/features/monitoring/MaintenanceDashboard";

export default function Settings() {
  return <DashboardLayout><MaintenanceDashboard initialSection="Settings" /></DashboardLayout>;
}