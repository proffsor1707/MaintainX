import LandingLayout from "@/layouts/LandingLayout";
import MaintenanceDashboard from "@/features/monitoring/MaintenanceDashboard";

export default function Login() {
  return <LandingLayout><MaintenanceDashboard initialSection="Login" /></LandingLayout>;
}