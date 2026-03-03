"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteForm } from "./route-form";
import type { Route, RouteFormData } from "@/types/route.types";

export function EditRouteForm({ route }: { route: Route }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(data: RouteFormData) {
    setSubmitError(null);
    try {
      const res = await fetch(`/api/routes/${route.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: data.origin.trim(),
          destination: data.destination.trim(),
          destinationState: data.destinationState?.trim() || undefined,
          description: data.description?.trim() || undefined,
          target: data.target,
          weeklyVolume: data.weeklyVolume,
          unitType: data.unitType,
          status: data.status,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No se pudo guardar.");
      }
      router.push("/admin/dashboard/routes");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No se pudo guardar. Verifica tener permisos de administrador.");
    }
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
          {submitError && (
            <p className="mb-4 text-sm text-destructive">{submitError}</p>
          )}
          <RouteForm
            initialValues={{
              origin: route.origin,
              destination: route.destination,
              destinationState: route.destinationState ?? "",
              description: route.description ?? "",
              target: route.target,
              weeklyVolume: route.weeklyVolume,
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
