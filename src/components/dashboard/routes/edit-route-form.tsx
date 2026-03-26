"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronRight, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteForm } from "./route-form";
import { RouteLogTable } from "./route-log-table";
import type { Route, RouteFormData } from "@/types/route.types";

export function EditRouteForm({ route }: { route: Route }) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);

  async function handleSubmit(data: RouteFormData) {
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
          unitTargets: data.unitTargets,
          status: data.status,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No se pudo guardar.");
      }
      toast.success("Ruta guardada correctamente.");
      router.push("/admin/dashboard/routes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar. Verifica tener permisos de administrador.");
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
          {route.createdByName && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              Creado por: {route.createdByName}
            </p>
          )}
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
          <RouteForm
            initialValues={{
              origin: route.origin,
              destination: route.destination,
              destinationState: route.destinationState ?? "",
              description: route.description ?? "",
              target: route.target,
              weeklyVolume: route.weeklyVolume,
              unitType: route.unitType,
              unitTargets: [{ unitType: route.unitType, target: route.target }],
              status: route.status,
            }}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/routes"
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          className="cursor-pointer select-none py-3"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <CardTitle className="text-base sm:text-lg">Historial de cambios</CardTitle>
            </div>
            {historyOpen
              ? <ChevronDown className="size-4 text-muted-foreground" />
              : <ChevronRight className="size-4 text-muted-foreground" />
            }
          </div>
          {!historyOpen && (
            <CardDescription className="text-xs sm:text-sm">
              Ver quién modificó esta ruta y cuándo.
            </CardDescription>
          )}
        </CardHeader>
        {historyOpen && (
          <CardContent>
            <RouteLogTable routeId={route.id} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
