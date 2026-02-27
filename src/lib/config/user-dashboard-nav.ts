import type { LucideIcon } from "lucide-react";
import { Route as RouteIcon, User as UserIcon } from "lucide-react";

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
    title: "Perfil",
    href: "/carrier/dashboard/profile",
    icon: UserIcon,
  },
];
