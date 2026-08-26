"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceLog } from "@/components/dashboard/support/maintenance-log";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { DataTableSkeleton } from "@/components/ui/skeletons";

export default function CollaboratorMaintenancePage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewMaintenance && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  if (!isLoaded) return <DataTableSkeleton />;
  if (!permissions?.canViewMaintenance) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Mantenimientos</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Bitácora de preventivos y correctivos del equipo de cómputo, con su evidencia.
        </p>
      </div>
      <MaintenanceLog />
    </div>
  );
}
