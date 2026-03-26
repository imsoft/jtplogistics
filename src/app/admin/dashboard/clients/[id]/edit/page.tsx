"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { Route as RouteIcon } from "lucide-react";
import { useResourceEdit } from "@/hooks/use-resource-edit";
import { ResourceEditHeader } from "@/components/dashboard/resources/resource-edit-header";
import { ClientForm } from "@/components/dashboard/resources/client-form";
import { ClientRoutesDialog } from "@/components/dashboard/clients/client-routes-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { formatMxnLive, parseMxn, formatMxn } from "@/lib/utils";
import { toast } from "sonner";
import type { Client, ClientFormData } from "@/types/client.types";

interface AssignedRoute {
  id: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  unitType: string;
  target: number | null;
  weeklyVolume: number | null;
  clientTarget: number | null;
  clientWeeklyVolume: number | null;
  createdByName: string | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  inactive: "Inactiva",
  pending: "Pendiente",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
};

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const [routesOpen, setRoutesOpen] = useState(false);

  const { data: client, isLoaded, error, isSubmitting, handleSubmit, handleDelete } =
    useResourceEdit<Client>({
      endpoint: "/api/admin/clients",
      redirectHref: `/admin/dashboard/clients/${id}`,
      deleteRedirectHref: "/admin/dashboard/clients",
    });

  const [routes, setRoutes] = useState<AssignedRoute[]>([]);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [editTargets, setEditTargets] = useState<Record<string, string>>({});
  const [editVolumes, setEditVolumes] = useState<Record<string, string>>({});
  const unitTypes = useUnitTypes();

  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  const loadRoutes = useCallback(() => {
    if (!id) return;
    fetch(`/api/admin/clients/${id}/routes?idsOnly=false`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AssignedRoute[]) => {
        setRoutes(data);
        const targets: Record<string, string> = {};
        const volumes: Record<string, string> = {};
        for (const r of data) {
          if (r.clientTarget != null) targets[r.id] = formatMxn(r.clientTarget);
          if (r.clientWeeklyVolume != null) volumes[r.id] = String(r.clientWeeklyVolume);
        }
        setEditTargets(targets);
        setEditVolumes(volumes);
        setRoutesLoaded(true);
      })
      .catch(() => setRoutesLoaded(true));
  }, [id]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  async function handleFormSubmit(formData: ClientFormData) {
    // Save route tarifa/volumen changes
    const routeUpdates = routes.map((route) => {
      const rawTarget = editTargets[route.id]?.trim();
      const rawVolume = editVolumes[route.id]?.trim();
      const parsedTarget = rawTarget ? parseMxn(rawTarget) : null;
      const parsedVolume = rawVolume ? Math.round(Number(rawVolume)) : null;

      return fetch(`/api/admin/clients/${id}/routes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: route.id,
          target: parsedTarget != null && !isNaN(parsedTarget) ? parsedTarget : null,
          weeklyVolume: parsedVolume != null && !isNaN(parsedVolume) ? parsedVolume : null,
        }),
      });
    });

    try {
      const results = await Promise.all(routeUpdates);
      const allOk = results.every((r) => r.ok);
      if (!allOk) toast.error("Error al guardar algunas tarifas");
    } catch {
      toast.error("Error al guardar tarifas");
    }

    // Save client data (this handles redirect on success)
    await handleSubmit(formData);
  }

  function handleTargetChange(routeId: string, value: string) {
    setEditTargets((prev) => ({ ...prev, [routeId]: formatMxnLive(value) }));
  }

  function handleVolumeChange(routeId: string, value: string) {
    setEditVolumes((prev) => ({ ...prev, [routeId]: value }));
  }

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <ResourceEditHeader
        title={client?.name ?? "Cliente"}
        description="Editar información del cliente."
        backHref={`/admin/dashboard/clients/${id}`}
        backLabel="Volver al perfil"
        deleteTitle="¿Eliminar cliente?"
        deleteDescription="Esta acción no se puede deshacer."
        onDelete={handleDelete}
      >
        <Button variant="outline" onClick={() => setRoutesOpen(true)}>
          <RouteIcon className="size-4" />
          Seleccionar rutas
        </Button>
      </ResourceEditHeader>

      <div className="w-full min-w-0">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {client && (
          <ClientForm
            initialValues={client}
            submitLabel="Guardar cambios"
            cancelHref={`/admin/dashboard/clients/${id}`}
            onSubmit={handleFormSubmit}
            isSubmitting={isSubmitting}
          >
            {/* Editable route table — inside the form, before action buttons */}
            {routesLoaded && routes.length > 0 && (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Tarifas y volumen por ruta ({routes.length})
                  </CardTitle>
                  <RouteIcon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="space-y-0">
                    {(() => {
                      const grouped = new Map<string, AssignedRoute[]>();
                      for (const r of routes) {
                        const group = grouped.get(r.unitType) ?? [];
                        group.push(r);
                        grouped.set(r.unitType, group);
                      }
                      return Array.from(grouped.entries()).map(([ut, items]) => (
                        <div key={ut}>
                          <div className="border-b bg-muted/60 px-4 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {unitTypeLabel[ut] ?? ut}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <div className="min-w-[560px]">
                              <div className="grid grid-cols-[1fr_minmax(120px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)] gap-x-6 border-b bg-muted/20 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                                <span>Ruta</span>
                                <span>Tarifa</span>
                                <span>Vol/sem</span>
                                <span>Estado</span>
                              </div>
                              {items.map((route) => (
                                <div
                                  key={route.id}
                                  className="grid grid-cols-[1fr_minmax(120px,1fr)_minmax(100px,1fr)_minmax(80px,1fr)] gap-x-6 items-center border-b px-4 py-3 last:border-0 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                      {route.origin} → {route.destination}
                                    </p>
                                    {route.destinationState && (
                                      <p className="text-muted-foreground text-xs truncate">{route.destinationState}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground text-xs shrink-0">$</span>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={editTargets[route.id] ?? ""}
                                      onChange={(e) => handleTargetChange(route.id, e.target.value)}
                                      className="h-7 w-28 text-xs"
                                    />
                                  </div>
                                  <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={editVolumes[route.id] ?? ""}
                                    onChange={(e) => handleVolumeChange(route.id, e.target.value)}
                                    className="h-7 w-20 text-xs"
                                  />
                                  <Badge variant={STATUS_VARIANT[route.status] ?? "outline"} className="text-xs">
                                    {STATUS_LABELS[route.status] ?? route.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </ClientForm>
        )}
      </div>

      {id && (
        <ClientRoutesDialog
          clientId={id}
          open={routesOpen}
          onOpenChange={setRoutesOpen}
          onSave={loadRoutes}
        />
      )}
    </div>
  );
}
