"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { UsersTable } from "@/components/dashboard/users/users-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function ProvidersPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewProviders && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  if (!isLoaded) return <p className="text-muted-foreground py-6">Cargando…</p>;
  if (!permissions?.canViewProviders) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Proveedores</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Gestiona proveedores de transporte.
        </p>
      </div>
      <Separator />
      <UsersTable
        defaultRole="carrier"
        detailBasePath="/collaborator/dashboard/providers"
        apiEndpoint="/api/collaborator/users"
      />
    </div>
  );
}
