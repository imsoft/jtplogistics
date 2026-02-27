"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { dashboardNavGroups } from "@/lib/config/dashboard-nav";

export function AppSidebar() {
  return (
    <DashboardSidebar
      navGroups={dashboardNavGroups}
      label="Administración"
      homeHref="/admin/dashboard"
      profileHref="/admin/dashboard/profile"
    />
  );
}
