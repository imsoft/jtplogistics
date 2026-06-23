"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { dashboardNavGroups } from "@/lib/config/dashboard-nav";

export function AppSidebar() {
  return (
    <DashboardSidebar
      navGroups={dashboardNavGroups}
      label="Administración"
      homeHref="/admin/dashboard"
      homeLabel="Inicio"
      profileHref="/admin/dashboard/profile"
    />
  );
}
