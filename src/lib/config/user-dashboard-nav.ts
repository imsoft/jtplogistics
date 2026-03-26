import type { LucideIcon } from "lucide-react";
import { User as UserIcon, Truck, MessageSquare, Users } from "lucide-react";

export interface UserDashboardNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const userDashboardNavItems: UserDashboardNavItem[] = [
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
