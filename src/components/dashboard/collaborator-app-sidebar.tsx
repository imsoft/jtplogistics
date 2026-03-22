"use client";

import { useEffect, useState } from "react";
import { User as UserIcon, Lightbulb, MessageSquare } from "lucide-react";
import { DashboardSidebar, type NavItem } from "@/components/dashboard/dashboard-sidebar";

interface Permissions {
  canViewMessages: boolean;
  canViewIdeas: boolean;
}

const allNavItems: (NavItem & { permission?: keyof Permissions })[] = [
  {
    title: "Mensajes",
    href: "/collaborator/dashboard/messages",
    icon: MessageSquare,
    permission: "canViewMessages",
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
    permission: "canViewIdeas",
  },
];

export function CollaboratorAppSidebar() {
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  useEffect(() => {
    fetch("/api/collaborator/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Permissions | null) => {
        if (data) setPermissions(data);
      })
      .catch(() => {});
  }, []);

  const navItems = allNavItems.filter((item) => {
    if (!item.permission) return true;
    if (!permissions) return true; // show all while loading
    return permissions[item.permission];
  });

  return (
    <DashboardSidebar
      navItems={navItems}
      label="Mi cuenta"
      homeHref="/collaborator/dashboard/profile"
      profileHref="/collaborator/dashboard/profile"
    />
  );
}
