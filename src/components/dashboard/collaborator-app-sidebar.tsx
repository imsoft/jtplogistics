"use client";

import { User as UserIcon, Lightbulb, MessageSquare } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const collaboratorNavItems = [
  {
    title: "Mensajes",
    href: "/collaborator/dashboard/messages",
    icon: MessageSquare,
  },
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
