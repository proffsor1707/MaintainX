import DashboardLayout from "@/layouts/DashboardLayout";
import MaintenanceDashboard from "@/features/monitoring/MaintenanceDashboard";

export default function Systems() {
  return <DashboardLayout><MaintenanceDashboard initialSection="Repositories" /></DashboardLayout>;
}