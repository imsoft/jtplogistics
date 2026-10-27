"use client";

import { User as UserIcon, ClipboardList, Wrench, LifeBuoy, UserRound, HandCoins, ReceiptText, Landmark, Wallet, FileBarChart } from "lucide-react";
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
    title: "Colaboradores",
    href: "/developer/dashboard/employees",
    icon: UserRound,
  },
  {
    title: "Cuentas por cobrar",
    href: "/developer/dashboard/billing/receivables",
    icon: HandCoins,
  },
  {
    title: "Cuentas por pagar",
    href: "/developer/dashboard/billing/payables",
    icon: ReceiptText,
  },
  {
    title: "Bancos",
    href: "/developer/dashboard/billing/banks",
    icon: Landmark,
  },
  {
    title: "Gastos",
    href: "/developer/dashboard/billing/expenses",
    icon: Wallet,
  },
  {
    title: "Reportes de administración",
    href: "/developer/dashboard/billing/reports",
    icon: FileBarChart,
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
