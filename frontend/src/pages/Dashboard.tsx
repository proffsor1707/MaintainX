import DashboardLayout from "@/layouts/DashboardLayout";
import MaintenanceDashboard from "@/features/monitoring/MaintenanceDashboard";

export default function Dashboard() {
  return <DashboardLayout><MaintenanceDashboard initialSection="Overview" /></DashboardLayout>;
}