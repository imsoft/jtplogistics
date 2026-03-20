"use client";

import { useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { userDashboardNavItems } from "@/lib/config/user-dashboard-nav";
import { useUnitTypes } from "@/hooks/use-unit-types";
import type { NavGroup } from "@/components/dashboard/dashboard-sidebar";

export function UserAppSidebar() {
  const unitTypes = useUnitTypes();

  const navGroups: NavGroup[] = useMemo(() => {
    const unitTypeItem = userDashboardNavItems.find(
      (item) => item.href === "/carrier/dashboard/unit-types"
    );
    const otherItems = userDashboardNavItems.filter(
      (item) => item.href !== "/carrier/dashboard/unit-types"
    );

    const mainItems = otherItems.filter(
      (item) => item.href === "/carrier/dashboard/messages"
    );
    const accountItems = otherItems.filter(
      (item) => item.href === "/carrier/dashboard/profile"
    );

    const groups: NavGroup[] = [
      { label: "Mi cuenta", items: mainItems },
    ];

    if (unitTypeItem) {
      const unitTypeSubItems = unitTypes.map((ut) => ({
        title: ut.label,
        href: `/carrier/dashboard/unit-types/${ut.value}`,
        icon: unitTypeItem.icon,
      }));
      groups.push({
        label: "Tipos de unidades",
        items: unitTypeSubItems,
      });
    }

    if (accountItems.length > 0) {
      groups.push({ label: "Cuenta", items: accountItems });
    }

    return groups;
  }, [unitTypes]);

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
