import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  User as UserIcon,
  Truck,
  MessageSquare,
  Users,
  Lightbulb,
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
    title: "Colaboradores",
    href: "/carrier/dashboard/collaborators",
    icon: Users,
  },
  {
    title: "Perfil",
    href: "/carrier/dashboard/profile",
    icon: UserIcon,
  },
];
