"use client";

import { useEffect, useState } from "react";
import {
  User as UserIcon,
  Lightbulb,
  MessageSquare,
  Route as RouteIcon,
  ScrollText,
  Boxes,
  Calculator,
  Truck,
  Users,
  UserRound,
  ShoppingBag,
  Laptop,
  Smartphone,
  Mail,
  ClipboardList,
} from "lucide-react";
import { DashboardSidebar, type NavItem, type NavGroup } from "@/components/dashboard/dashboard-sidebar";

interface Permissions {
  canViewMessages: boolean;
  canViewIdeas: boolean;
  canViewRoutes: boolean;
  canViewRouteLogs: boolean;
  canViewUnitTypes: boolean;
  canViewQuotes: boolean;
  canViewProviders: boolean;
  canViewClients: boolean;
  canViewEmployees: boolean;
  canViewVendors: boolean;
  canViewLaptops: boolean;
  canViewPhones: boolean;
  canViewEmails: boolean;
  canViewTasks: boolean;
}

const BASE = "/collaborator/dashboard";

interface PermNavItem extends NavItem {
  permission?: keyof Permissions;
}

interface PermNavGroup {
  label: string;
  items: PermNavItem[];
}

const allNavGroups: PermNavGroup[] = [
  {
    label: "Operaciones",
    items: [
      { title: "Rutas", href: `${BASE}/routes`, icon: RouteIcon, permission: "canViewRoutes" },
      { title: "Historial de cambios", href: `${BASE}/route-logs`, icon: ScrollText, permission: "canViewRouteLogs" },
      { title: "Tipos de unidades", href: `${BASE}/unit-types`, icon: Boxes, permission: "canViewUnitTypes" },
      { title: "Cotizador", href: `${BASE}/quotes`, icon: Calculator, permission: "canViewQuotes" },
      { title: "Proveedores", href: `${BASE}/providers`, icon: Truck, permission: "canViewProviders" },
      { title: "Clientes", href: `${BASE}/clients`, icon: Users, permission: "canViewClients" },
    ],
  },
  {
    label: "Equipo",
    items: [
      { title: "Colaboradores", href: `${BASE}/employees`, icon: UserRound, permission: "canViewEmployees" },
      { title: "Vendedores", href: `${BASE}/vendors`, icon: ShoppingBag, permission: "canViewVendors" },
    ],
  },
  {
    label: "Activos",
    items: [
      { title: "Laptops", href: `${BASE}/laptops`, icon: Laptop, permission: "canViewLaptops" },
      { title: "Celulares", href: `${BASE}/phones`, icon: Smartphone, permission: "canViewPhones" },
      { title: "Correos", href: `${BASE}/emails`, icon: Mail, permission: "canViewEmails" },
    ],
  },
  {
    label: "Otros",
    items: [
      { title: "Mensajes", href: `${BASE}/messages`, icon: MessageSquare, permission: "canViewMessages" },
      { title: "Ideas", href: `${BASE}/ideas`, icon: Lightbulb, permission: "canViewIdeas" },
      { title: "Tareas", href: `${BASE}/tasks`, icon: ClipboardList, permission: "canViewTasks" },
    ],
  },
  {
    label: "Mi cuenta",
    items: [
      { title: "Perfil", href: `${BASE}/profile`, icon: UserIcon },
    ],
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

  const navGroups: NavGroup[] = allNavGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => {
        if (!item.permission) return true;
        if (!permissions) return false; // hide until loaded
        return permissions[item.permission];
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <DashboardSidebar
      navGroups={navGroups}
      label="Mi panel"
      homeHref={`${BASE}/profile`}
      profileHref={`${BASE}/profile`}
    />
  );
}
