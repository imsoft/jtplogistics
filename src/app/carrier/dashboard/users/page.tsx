"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CarrierMembersManager } from "@/components/dashboard/users/carrier-members-manager";

/**
 * Los usuarios de la empresa, para consultarlos. Solo la ve el usuario
 * principal. Los administra JTP desde su panel (decisión del cliente).
 */
export default function CarrierUsersPage() {
  const [isPrincipal, setIsPrincipal] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/carrier/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { isPrincipal: boolean } | null) => setIsPrincipal(d?.isPrincipal ?? false))
      .catch(() => setIsPrincipal(false));
  }, []);

  if (isPrincipal === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isPrincipal) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Los usuarios de la empresa los administra JTP.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Quién de tu empresa tiene acceso y qué puede hacer. Todo lo que hagan queda a nombre de tu empresa y con su
          nombre en el registro.
        </p>
      </div>
      <CarrierMembersManager apiBase="/api/carrier/members" mode="carrier" />
    </div>
  );
}
