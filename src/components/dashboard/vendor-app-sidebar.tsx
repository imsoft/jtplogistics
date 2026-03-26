"use client";

import { User as UserIcon, Calculator, Users } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const vendorNavItems = [
  {
    title: "Cotizador",
    href: "/vendor/dashboard/quotes",
    icon: Calculator,
  },
  {
    title: "Perfil",
    href: "/vendor/dashboard/profile",
    icon: UserIcon,
  },
  {
    title: "Colaboradores",
    href: "/vendor/dashboard/collaborators",
    icon: Users,
  },
];

export function VendorAppSidebar() {
  return (
    <DashboardSidebar
      navItems={vendorNavItems}
      label="Mi cuenta"
      homeHref="/vendor/dashboard/quotes"
      profileHref="/vendor/dashboard/profile"
    />
  );
}
