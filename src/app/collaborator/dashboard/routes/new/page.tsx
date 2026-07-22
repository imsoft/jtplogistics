"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/skeletons";
import { RouteForm } from "@/components/dashboard/routes/route-form";
import { useRoutesStore } from "@/hooks/use-routes-store";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import type { Route, RouteFormData } from "@/types/route.types";

function routeToExistingPairs(r: Route) {
  const pairs =
    r.unitTargets && r.unitTargets.length > 0
      ? r.unitTargets
      : [{ unitType: r.unitType, target: r.target }];
  return pairs.map((ut) => ({
    origin: r.origin,
    destination: r.destination,
    unitType: ut.unitType,
  }));
}

export default function NewCollaboratorRoutePage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const { routes, addRoute, error: storeError } = useRoutesStore();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canCreateRoutes && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/routes");
    }
  }, [isLoaded, permissions, router]);

  async function handleSubmit(data: RouteFormData) {
    setSubmitError(null);
    const route = await addRoute(data);
    if (route) router.push("/collaborator/dashboard/routes");
    else setSubmitError(storeError ?? "No se pudo crear la ruta.");
  }

  if (!isLoaded) return <FormSkeleton />;
  if (!permissions?.canCreateRoutes) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/collaborator/dashboard/routes" aria-label="Volver a rutas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="page-heading">Nueva ruta</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">
            Completa los datos para crear una nueva ruta.
          </p>
        </div>
      </div>
      <div className="w-full min-w-0">
        {submitError && <p className="mb-4 text-sm text-destructive">{submitError}</p>}
        <RouteForm
          submitLabel="Crear ruta"
          cancelHref="/collaborator/dashboard/routes"
          existingRoutes={routes.flatMap(routeToExistingPairs)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
