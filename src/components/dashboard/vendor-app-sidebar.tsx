"use client";

import { User as UserIcon, Calculator, FileText, LifeBuoy } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const vendorNavItems = [
  {
    title: "Cotizador",
    href: "/vendor/dashboard/quotes",
    icon: Calculator,
  },
  {
    title: "Mis cotizaciones",
    href: "/vendor/dashboard/generated-quotes",
    icon: FileText,
  },
  {
    title: "Soporte de TI",
    href: "/vendor/dashboard/support",
    icon: LifeBuoy,
  },
  {
    title: "Perfil",
    href: "/vendor/dashboard/profile",
    icon: UserIcon,
  },
];

export function VendorAppSidebar() {
  return (
    <DashboardSidebar
      navItems={vendorNavItems}
      label="Mi cuenta"
      homeHref="/vendor/dashboard"
      homeLabel="Inicio"
      profileHref="/vendor/dashboard/profile"
    />
  );
}
