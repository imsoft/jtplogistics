import type { LucideIcon } from "lucide-react";
import { Route as RouteIcon, User as UserIcon, Truck, MessageSquare } from "lucide-react";

export interface UserDashboardNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const userDashboardNavItems: UserDashboardNavItem[] = [
  {
    title: "Rutas",
    href: "/carrier/dashboard/routes",
    icon: RouteIcon,
  },
  {
    title: "Tipos de unidades",
    href: "/carrier/dashboard/unit-types",
    icon: Truck,
  },
  {
    title: "Mensajes",
    href: "/carrier/dashboard/messages",
    icon: MessageSquare,
  },
  {
    title: "Perfil",
    href: "/carrier/dashboard/profile",
    icon: UserIcon,
  },
];
