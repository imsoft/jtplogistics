"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { UnitTypesManager } from "@/components/dashboard/unit-types/unit-types-manager";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorUnitTypesPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewUnitTypes && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  if (!isLoaded) {
    return (
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="page-heading">Tipos de unidades</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Gestiona los tipos de unidades disponibles al crear rutas.
          </p>
        </div>
        <Separator />
        <DataTableSkeleton />
      </div>
    );
  }

  if (!permissions?.canViewUnitTypes) return null;

  return (
    <UnitTypesManager
      apiBase="/api/collaborator/unit-types"
      newHref="/collaborator/dashboard/unit-types/new"
      canCreate={permissions.canCreateUnitTypes}
      canUpdate={permissions.canUpdateUnitTypes}
      canDelete={permissions.canDeleteUnitTypes}
    />
  );
}
