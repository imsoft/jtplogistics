"use client";

import { useState, useEffect, useMemo } from "react";
import { MoveRight, MapPin, Truck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { toast } from "sonner";
import type { Route } from "@/types/route.types";
import { fuzzyMatch } from "@/lib/search";

interface ClientRoutesDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

// Una fila expandida = ruta × tipo de unidad
interface RouteRow {
  key: string; // `${routeId}:${unitType}`
  routeId: string;
  unitType: string;
  origin: string;
  destination: string;
  destinationState: string | null;
  status: string;
  createdByName: string | null;
}

export function ClientRoutesDialog({ clientId, open, onOpenChange, onSave }: ClientRoutesDialogProps) {
  const [rows, setRows] = useState<RouteRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const unitTypes = useUnitTypes();

  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  useEffect(() => {
    if (!open) return;
    setIsLoaded(false);
    setSearch("");

    Promise.all([
      fetch("/api/routes").then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/admin/clients/${clientId}/routes`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([allRoutes, assignedPairs]: [Route[], { routeId: string; unitType: string }[]]) => {
      // Expandir rutas a una fila por unitType
      const expanded: RouteRow[] = [];
      for (const route of allRoutes) {
        const types =
          route.unitTargets && route.unitTargets.length > 0
            ? route.unitTargets.map((ut) => ut.unitType)
            : [route.unitType];
        for (const ut of types) {
          expanded.push({
            key: `${route.id}:${ut}`,
            routeId: route.id,
            unitType: ut,
            origin: route.origin,
            destination: route.destination,
            destinationState: route.destinationState ?? null,
            status: route.status,
            createdByName: route.createdByName ?? null,
          });
        }
      }
      setRows(expanded);

      const selectedKeys = new Set(
        assignedPairs.map((p) => `${p.routeId}:${p.unitType}`)
      );
      setSelected(selectedKeys);
      setIsLoaded(true);
    });
  }, [open, clientId]);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        fuzzyMatch(r.origin, q) ||
        fuzzyMatch(r.destination, q) ||
        fuzzyMatch(r.destinationState ?? "", q) ||
        fuzzyMatch(unitTypeLabel[r.unitType] ?? r.unitType, q) ||
        fuzzyMatch(r.createdByName ?? "", q)
    );
  }, [rows, search, unitTypeLabel]);

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((r) => selected.has(r.key))) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.key));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(r.key));
        return next;
      });
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const body = Array.from(selected).map((key) => {
        const [routeId, unitType] = key.split(":");
        return { routeId, unitType };
      });
      const res = await fetch(`/api/admin/clients/${clientId}/routes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Rutas asignadas correctamente.");
      onOpenChange(false);
      onSave?.();
    } catch {
      toast.error("No se pudieron guardar las rutas. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Seleccionar rutas</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          {!isLoaded ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay rutas.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[540px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <th className="w-10 py-2 pl-3 pr-1 text-left">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAll}
                        className="size-4 rounded border-input accent-primary"
                        aria-label="Seleccionar todas"
                      />
                    </th>
                    <th className="py-2 pr-4 text-left font-medium">
                      <span className="flex items-center gap-1"><MoveRight className="size-3" /> Ruta</span>
                    </th>
                    <th className="py-2 pr-4 text-left font-medium">
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> Estado</span>
                    </th>
                    <th className="py-2 pr-4 text-left font-medium">
                      <span className="flex items-center gap-1"><Truck className="size-3" /> Tipo</span>
                    </th>
                    <th className="py-2 pr-4 text-left font-medium">
                      <span className="flex items-center gap-1"><User className="size-3" /> Creado por</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => toggleRow(row.key)}
                      className="cursor-pointer border-b last:border-b-0 hover:bg-hover hover:text-hover-foreground transition-colors"
                    >
                      <td className="py-2.5 pl-3 pr-1">
                        <input
                          type="checkbox"
                          checked={selected.has(row.key)}
                          onChange={() => toggleRow(row.key)}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 rounded border-input accent-primary"
                          aria-label={`Seleccionar ${row.origin} → ${row.destination} (${unitTypeLabel[row.unitType] ?? row.unitType})`}
                        />
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="flex items-center gap-1 font-medium">
                          <span>{row.origin}</span>
                          <MoveRight className="size-3 shrink-0 text-muted-foreground" />
                          <span>{row.destination}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ROUTE_STATUS_LABELS[row.status as keyof typeof ROUTE_STATUS_LABELS] ?? row.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {row.destinationState ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {unitTypeLabel[row.unitType] ?? row.unitType}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {row.createdByName ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground text-center sm:text-left">
            {selected.size} asignación{selected.size !== 1 ? "es" : ""} seleccionada{selected.size !== 1 ? "s" : ""}
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSave} disabled={isSaving || !isLoaded}>
              {isSaving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
