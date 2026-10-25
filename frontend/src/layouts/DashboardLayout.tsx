import type { PropsWithChildren } from "react";

import ProtectedRoute from "@/routes/ProtectedRoute";

export default function DashboardLayout({ children }: PropsWithChildren) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
import siteLogo from './assets/MainTain.png';
