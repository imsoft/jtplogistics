"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteForm } from "@/components/dashboard/routes/route-form";
import { useRoutesStore } from "@/hooks/use-routes-store";
import type { RouteFormData } from "@/types/route.types";

export default function EditRoutePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { getRouteById, updateRoute, isLoaded, error: storeError } = useRoutesStore();
  const route = getRouteById(id);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(data: RouteFormData) {
    setSubmitError(null);
    const ok = await updateRoute(id, data);
    if (ok) router.push("/admin/dashboard/routes");
    else setSubmitError("No se pudo guardar. Verifica tener permisos de administrador.");
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Ruta no encontrada.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/dashboard/routes">Volver a rutas</Link>
        </Button>
      </div>
    );
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Editar ruta</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">
            {route.origin} → {route.destination}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Datos de la ruta</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Modifica origen, destino, descripción o estado. Los combos muestran ciudades de México por estado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(storeError || submitError) && (
            <p className="mb-4 text-sm text-destructive">{submitError ?? storeError}</p>
          )}
          <RouteForm
            key={route.id}
            initialValues={{
              origin: route.origin,
              destination: route.destination,
              description: route.description ?? "",
              target: route.target,
              unitType: route.unitType,
              status: route.status,
            }}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/routes"
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
