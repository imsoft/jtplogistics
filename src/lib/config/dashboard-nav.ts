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
import { ClipboardList } from "lucide-react";
import { Settings } from "lucide-react";
import { Boxes } from "lucide-react";
import { Users } from "lucide-react";
import { Copy } from "lucide-react";
import { MessageSquare } from "lucide-react";
import { ScrollText } from "lucide-react";
import { Ship } from "lucide-react";
import { DollarSign } from "lucide-react";
import { AlertTriangle } from "lucide-react";

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
      { title: "Historial de cambios", href: "/admin/dashboard/routes/logs", icon: ScrollText },
      { title: "Tipos de unidades", href: "/admin/dashboard/unit-types", icon: Boxes },
      { title: "Tipos de incidencia", href: "/admin/dashboard/incident-types", icon: AlertTriangle },
      { title: "Cotizador", href: "/admin/dashboard/quotes", icon: Calculator },
      { title: "Proveedores", href: "/admin/dashboard/providers", icon: Truck },
      { title: "Clientes", href: "/admin/dashboard/clients", icon: Users },
      { title: "Tabla de embarques", href: "/admin/dashboard/shipments", icon: Ship },
      { title: "Tabla de finanzas", href: "/admin/dashboard/finances", icon: DollarSign },
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
      { title: "Mensajes", href: "/admin/dashboard/messages", icon: MessageSquare },
      { title: "Ideas", href: "/admin/dashboard/ideas", icon: Lightbulb },
      { title: "Tareas", href: "/admin/dashboard/tasks", icon: ClipboardList },
      { title: "Cuenta demo", href: "/admin/dashboard/demo-account", icon: Copy },
      { title: "Configuración", href: "/admin/dashboard/settings", icon: Settings },
    ],
  },
];
