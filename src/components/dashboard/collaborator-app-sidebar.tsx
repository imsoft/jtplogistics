"use client";

import { User as UserIcon, Lightbulb } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const collaboratorNavItems = [
  {
    title: "Perfil",
    href: "/collaborator/dashboard/profile",
    icon: UserIcon,
  },
  {
    title: "Ideas",
    href: "/collaborator/dashboard/ideas",
    icon: Lightbulb,
  },
];

export function CollaboratorAppSidebar() {
  return (
    <DashboardSidebar
      navItems={collaboratorNavItems}
      label="Mi cuenta"
      homeHref="/collaborator/dashboard/profile"
      profileHref="/collaborator/dashboard/profile"
    />
  );
}
