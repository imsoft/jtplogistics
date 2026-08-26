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
  Users,
  UserRound,
  ShoppingBag,
  Truck,
  Laptop,
  Smartphone,
  Mail,
  MailCheck,
  ClipboardList,
  Network,
  Ship,
  DollarSign,
  Anchor,
  LayoutPanelTop,
  LifeBuoy,
  Wrench,
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
  canViewMaintenance: boolean;
  canViewEmailDemos: boolean;
  canViewPhones: boolean;
  canViewEmails: boolean;
  canViewTasks: boolean;
  canViewShipments: boolean;
  canViewFinances: boolean;
  canViewMaritimeQuotes: boolean;
  canViewMural: boolean;
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
      { title: "Cotizador", href: `${BASE}/quotes`, icon: Calculator, permission: "canViewQuotes" },
      { title: "Cotización marítima", href: `${BASE}/maritime-quotes`, icon: Anchor, permission: "canViewMaritimeQuotes" },
      { title: "Tipos de unidades", href: `${BASE}/unit-types`, icon: Boxes, permission: "canViewUnitTypes" },
      { title: "Mensajes", href: `${BASE}/messages`, icon: MessageSquare, permission: "canViewMessages" },
      
    ],
  },
  {
    label: "Finanzas",
    items: [
      { title: "Embarques", href: `${BASE}/shipments`, icon: Ship, permission: "canViewShipments" },
      { title: "Finanzas", href: `${BASE}/finances`, icon: DollarSign, permission: "canViewFinances" },
    ],
  },
  {
    label: "Contactos",
    items: [
      { title: "Clientes", href: `${BASE}/clients`, icon: Users, permission: "canViewClients" },
      { title: "Proveedores", href: `${BASE}/providers`, icon: Truck, permission: "canViewProviders" },
    ],
  },
  {
    label: "Equipo",
    items: [
      { title: "Mural", href: `${BASE}/mural`, icon: LayoutPanelTop, permission: "canViewMural" },
      { title: "Vendedores", href: `${BASE}/vendors`, icon: ShoppingBag, permission: "canViewVendors" },
      { title: "Colaboradores", href: `${BASE}/employees`, icon: UserRound, permission: "canViewEmployees" },
      { title: "Organigrama", href: `${BASE}/employees/org-chart`, icon: Network, permission: "canViewEmployees" },
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
      { title: "Ideas", href: `${BASE}/ideas`, icon: Lightbulb, permission: "canViewIdeas" },
      { title: "Correos de prueba", href: `${BASE}/email-demos`, icon: MailCheck, permission: "canViewEmailDemos" },
      { title: "Tareas", href: `${BASE}/tasks`, icon: ClipboardList, permission: "canViewTasks" },
      { title: "Historial de cambios", href: `${BASE}/route-logs`, icon: ScrollText, permission: "canViewRouteLogs" },
    ],
  },
  {
    label: "Mi cuenta",
    items: [
      { title: "Mantenimientos", href: `${BASE}/maintenance`, icon: Wrench, permission: "canViewMaintenance" },
      { title: "Soporte de TI", href: `${BASE}/support`, icon: LifeBuoy },
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
      homeHref={BASE}
      homeLabel="Inicio"
      profileHref={`${BASE}/profile`}
    />
  );
}
