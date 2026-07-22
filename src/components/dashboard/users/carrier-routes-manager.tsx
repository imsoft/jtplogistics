"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatMxn } from "@/lib/utils";

interface CarrierRouteListItem {
  id: string;
  unitType: string;
  carrierTarget: number | null;
  editUnlockRequested: boolean;
  editUnlockApproved: boolean;
  route: {
    origin: string;
    destination: string;
    target: number | null;
    description: string | null;
  };
}

interface CarrierRoutesManagerProps {
  routes: CarrierRouteListItem[];
  onRouteDeleted?: (routeId: string) => void;
  /** Vista de solo lectura: oculta la columna de acción y el botón de desvincular. */
  readOnly?: boolean;
}

export function CarrierRoutesManager({ routes, onRouteDeleted, readOnly = false }: CarrierRoutesManagerProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [routesToShow, setRoutesToShow] = useState(routes);

  const gridCols = readOnly
    ? "grid-cols-[1fr_120px_120px_72px]"
    : "grid-cols-[1fr_120px_120px_72px_48px]";

  async function handleDelete(carrierRouteId: string, routeLabel: string) {
    setDeleting(carrierRouteId);
    try {
      const res = await fetch("/api/admin/carrier-routes/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrierRouteId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "No se pudo desvincular la ruta");
      }

      setRoutesToShow((prev) => prev.filter((r) => r.id !== carrierRouteId));
      toast.success(`Ruta ${routeLabel} desvinculada correctamente`);
      onRouteDeleted?.(carrierRouteId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo desvincular la ruta");
    } finally {
      setDeleting(null);
    }
  }

  if (routesToShow.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed mx-4 mb-4 p-4 text-center text-sm">
        Este transportista no ha seleccionado ninguna ruta.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className={`grid ${gridCols} gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground`}>
          <span>Ruta</span>
          <span>Target JTP</span>
          <span>Target carrier</span>
          <span>Dif.</span>
          {!readOnly && <span className="text-center">Acción</span>}
        </div>
        {routesToShow.map((cr) => (
          <div
            key={cr.id}
            className={`grid ${gridCols} gap-3 items-center border-b px-4 py-3 last:border-0`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {cr.route.origin} → {cr.route.destination}
              </p>
              {cr.route.description && (
                <p className="text-muted-foreground truncate text-xs">
                  {cr.route.description}
                </p>
              )}
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {cr.route.target != null ? formatMxn(cr.route.target) : "—"}
            </span>
            <span className="font-mono text-sm font-medium">
              {cr.carrierTarget != null ? formatMxn(cr.carrierTarget) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              {cr.route.target != null && cr.carrierTarget != null
                ? cr.carrierTarget - cr.route.target > 0
                  ? `+$${(cr.carrierTarget - cr.route.target).toLocaleString("es-MX")}`
                  : `-$${Math.abs(cr.carrierTarget - cr.route.target).toLocaleString("es-MX")}`
                : "—"}
            </span>
            {!readOnly && (
            <div className="flex justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleting === cr.id}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desvincular ruta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se desvinculará la ruta {cr.route.origin} → {cr.route.destination} del
                      transportista. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-3 justify-end">
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        handleDelete(cr.id, `${cr.route.origin} → ${cr.route.destination}`)
                      }
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Desvincular
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
