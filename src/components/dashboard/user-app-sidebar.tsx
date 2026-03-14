"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { userDashboardNavItems } from "@/lib/config/user-dashboard-nav";

export function UserAppSidebar() {
  return (
    <DashboardSidebar
      navItems={userDashboardNavItems}
      label="Mi cuenta"
      homeHref="/carrier/dashboard"
      profileHref="/carrier/dashboard/profile"
      showWhatsAppContact
    />
  );
}
