"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteForm } from "@/components/dashboard/routes/route-form";
import { useRoutesStore } from "@/hooks/use-routes-store";
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

export default function NewRoutePage() {
  const router = useRouter();
  const { routes, addRoute, error: storeError } = useRoutesStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(data: RouteFormData) {
    setSubmitError(null);
    const route = await addRoute(data);
    if (route) router.push("/admin/dashboard/routes");
    else setSubmitError(storeError ?? "No se pudo crear la ruta. Verifica tener permisos de administrador.");
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/routes" aria-label="Volver a rutas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Nueva ruta</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">
            Completa los datos para crear una nueva ruta.
          </p>
        </div>
      </div>
      <div className="w-full min-w-0">
        {submitError && (
          <p className="mb-4 text-sm text-destructive">{submitError}</p>
        )}
        <RouteForm
          submitLabel="Crear ruta"
          cancelHref="/admin/dashboard/routes"
          existingRoutes={routes.flatMap(routeToExistingPairs)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
