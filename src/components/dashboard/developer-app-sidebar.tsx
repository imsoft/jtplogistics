"use client";

import { User as UserIcon, ClipboardList, Wrench, LifeBuoy } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const developerNavItems = [
  {
    title: "Mantenimientos",
    href: "/developer/dashboard/maintenance",
    icon: Wrench,
  },
  {
    title: "Reportes de equipo",
    href: "/developer/dashboard/tickets",
    icon: LifeBuoy,
  },
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
      homeHref="/developer/dashboard"
      homeLabel="Inicio"
      profileHref="/developer/dashboard/profile"
    />
  );
}
