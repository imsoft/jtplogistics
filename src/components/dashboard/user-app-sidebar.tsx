"use client";

import { useEffect, useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { userDashboardNavItems } from "@/lib/config/user-dashboard-nav";
import { useUnitTypes } from "@/hooks/use-unit-types";
import type { NavGroup, NavItem } from "@/components/dashboard/dashboard-sidebar";
import type { CarrierAbility } from "@/lib/carrier-permissions";

type Abilities = Record<CarrierAbility, boolean>;

/**
 * Qué sección pide qué permiso. Lo que no está aquí lo ve cualquiera de la
 * empresa (el inicio y el perfil personal).
 */
const ABILITY_BY_HREF: Record<string, CarrierAbility> = {
  "/carrier/dashboard/unit-types": "viewRates",
  "/carrier/dashboard/suggestions": "suggest",
  "/carrier/dashboard/messages": "message",
};

export function UserAppSidebar() {
  const unitTypes = useUnitTypes();
  // null mientras carga: se enseña solo el inicio para no parpadear secciones
  // que luego desaparecen.
  const [can, setCan] = useState<Abilities | null>(null);

  useEffect(() => {
    fetch("/api/carrier/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { can: Abilities } | null) => setCan(d?.can ?? null))
      .catch(() => {});
  }, []);

  const navGroups: NavGroup[] = useMemo(() => {
    const allowed = (href: string) => {
      const ability = ABILITY_BY_HREF[href];
      return !ability || Boolean(can?.[ability]);
    };

    const mainItems: NavItem[] = [];
    for (const item of userDashboardNavItems) {
      if (item.href === "/carrier/dashboard/profile") continue;
      if (!allowed(item.href)) continue;

      if (item.href === "/carrier/dashboard/unit-types") {
        mainItems.push({
          title: item.title,
          href: item.href,
          icon: item.icon,
          subItems: unitTypes.map((ut) => ({
            title: ut.label,
            href: `/carrier/dashboard/unit-types/${ut.value}`,
          })),
        });
      } else {
        mainItems.push({ title: item.title, href: item.href, icon: item.icon });
      }
    }

    const accountItems: NavItem[] = userDashboardNavItems
      .filter((item) => item.href === "/carrier/dashboard/profile")
      .map((item) => ({ title: item.title, href: item.href, icon: item.icon }));

    // Administrar usuarios es solo del principal: no se delega.
    if (can?.manageUsers) {
      accountItems.push({
        title: "Usuarios",
        href: "/carrier/dashboard/users",
        icon: UsersRound,
      });
    }

    const groups: NavGroup[] = [{ label: "Mi cuenta", items: mainItems }];
    if (accountItems.length > 0) groups.push({ label: "Cuenta", items: accountItems });
    return groups;
  }, [unitTypes, can]);

  return (
    <DashboardSidebar
      navGroups={navGroups}
      label="Mi cuenta"
      homeHref="/carrier/dashboard"
      profileHref="/carrier/dashboard/profile"
      showWhatsAppContact
    />
  );
}
