import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  User as UserIcon,
  Truck,
  MessageSquare,
  Lightbulb,
  ClipboardList,
} from "lucide-react";

export interface UserDashboardNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const userDashboardNavItems: UserDashboardNavItem[] = [
  {
    title: "Inicio",
    href: "/carrier/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tipos de unidades",
    href: "/carrier/dashboard/unit-types",
    icon: Truck,
  },
  {
    title: "Unidades y operadores",
    href: "/carrier/dashboard/fleet",
    icon: ClipboardList,
  },
  {
    title: "Sugerencias",
    href: "/carrier/dashboard/suggestions",
    icon: Lightbulb,
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
