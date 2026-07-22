"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { UsersTable } from "@/components/dashboard/users/users-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function ProvidersPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const [count, setCount] = useState<number | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewProviders && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  useEffect(() => {
    if (!permissions?.canViewProviders) return;
    fetch("/api/collaborator/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown[]) => setCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setCount(null));
  }, [permissions]);

  if (!isLoaded) {
    return (
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <div className="min-w-0">
          <h1 className="page-heading">Proveedores</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Transportistas registrados en la plataforma.
          </p>
        </div>
        <Separator />
        <DataTableSkeleton />
      </div>
    );
  }

  if (!permissions?.canViewProviders) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">
          Proveedores{" "}
          {count !== null && (
            <span className="text-muted-foreground font-normal">({count})</span>
          )}
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          {count === 1
            ? "1 transportista registrado en la plataforma."
            : `${count ?? ""} transportistas registrados en la plataforma.`}
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
