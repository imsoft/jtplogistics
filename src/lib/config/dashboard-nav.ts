import type { LucideIcon } from "lucide-react";
import { Route as RouteIcon } from "lucide-react";
import { Truck } from "lucide-react";
import { Calculator } from "lucide-react";
import { UserRound } from "lucide-react";
import { Laptop } from "lucide-react";
import { Smartphone } from "lucide-react";
import { Mail } from "lucide-react";
import { Lightbulb } from "lucide-react";
import { ShoppingBag } from "lucide-react";

export interface DashboardNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Operaciones",
    items: [
      { title: "Rutas", href: "/admin/dashboard/routes", icon: RouteIcon },
      { title: "Cotizador", href: "/admin/dashboard/quotes", icon: Calculator },
      { title: "Proveedores", href: "/admin/dashboard/providers", icon: Truck },
    ],
  },
  {
    label: "Equipo",
    items: [
      { title: "Colaboradores", href: "/admin/dashboard/employees", icon: UserRound },
      { title: "Vendedores", href: "/admin/dashboard/vendors", icon: ShoppingBag },
    ],
  },
  {
    label: "Activos",
    items: [
      { title: "Laptops", href: "/admin/dashboard/laptops", icon: Laptop },
      { title: "Celulares", href: "/admin/dashboard/phones", icon: Smartphone },
      { title: "Correos", href: "/admin/dashboard/emails", icon: Mail },
    ],
  },
  {
    label: "Otros",
    items: [
      { title: "Ideas", href: "/admin/dashboard/ideas", icon: Lightbulb },
    ],
  },
];
