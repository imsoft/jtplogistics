"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoutesCrud } from "@/components/dashboard/routes/routes-crud";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorRoutesPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const [count, setCount] = useState<number | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewRoutes && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  useEffect(() => {
    if (!permissions?.canViewRoutes) return;
    fetch("/api/routes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown[]) => setCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setCount(null));
  }, [permissions]);

  if (!isLoaded || !permissions?.canViewRoutes) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading flex items-center gap-2">
            Rutas
            {count !== null && (
              <span className="text-sm font-normal text-muted-foreground">({count})</span>
            )}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Rutas de entrega registradas en el sistema.
          </p>
        </div>
        {permissions.canCreateRoutes && (
          <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
            <Link href="/collaborator/dashboard/routes/new">
              <Plus className="size-4" />
              Nueva ruta
            </Link>
          </Button>
        )}
      </div>
      <Separator />
      <RoutesCrud
        basePath="/collaborator/dashboard/routes"
        canEdit={permissions.canUpdateRoutes}
        canDelete={permissions.canDeleteRoutes}
      />
    </div>
  );
}
