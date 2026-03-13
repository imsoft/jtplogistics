"use client";

import { User as UserIcon, ClipboardList } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const developerNavItems = [
  {
    title: "Mis tareas",
    href: "/developer/dashboard/tasks",
    icon: ClipboardList,
  },
  {
    title: "Perfil",
    href: "/developer/dashboard/profile",
    icon: UserIcon,
  },
];

export function DeveloperAppSidebar() {
  return (
    <DashboardSidebar
      navItems={developerNavItems}
      label="Mi cuenta"
      homeHref="/developer/dashboard/tasks"
      profileHref="/developer/dashboard/profile"
    />
  );
}
