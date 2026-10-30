"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { MoveRight, MapPin, Truck, User, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/ui/app-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { toast } from "sonner";
import { normalizeSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { clientRoutesEndpoint } from "./client-routes";
import { SAVE_CHANGES, useConfirm } from "@/components/ui/confirm-provider";

interface ClientRoutesDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

// Una fila = ruta × tipo de unidad (así la devuelve el catálogo)
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

/**
 * Búsqueda por palabras: cada palabra escrita tiene que aparecer en algún
 * campo de la fila (ciudad, estado, tipo de unidad o quien la creó), sin
 * importar acentos ni el orden. "guadalajara monterrey caja" encuentra
 * Guadalajara → Monterrey en caja seca.
 */
function matchesWords(haystack: string, query: string) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = normalizeSearch(haystack);
  return words.every((w) => text.includes(w));
}

function distinctSorted(values: (string | null)[]) {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

export function ClientRoutesDialog({ clientId, open, onOpenChange, onSave }: ClientRoutesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl">
        {/* El contenido se monta en cada apertura: búsqueda y filtros nacen limpios. */}
        {open && <RoutesPicker clientId={clientId} onOpenChange={onOpenChange} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function RoutesPicker({ clientId, onOpenChange, onSave }: Omit<ClientRoutesDialogProps, "open">) {
  const confirm = useConfirm();
  const [rows, setRows] = useState<RouteRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [unitType, setUnitType] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const selectContainer = useRef<HTMLDivElement | null>(null);

  const unitTypes = useUnitTypes();
  const unitTypeLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ut of unitTypes) map[ut.value] = ut.label;
    return map;
  }, [unitTypes]);

  useEffect(() => {
    const endpoint = clientRoutesEndpoint(clientId);
    let cancelled = false;
    Promise.all([
      fetch(`${endpoint}?catalog=true`).then((r) => (r.ok ? r.json() : [])),
      fetch(endpoint).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([catalog, assignedPairs]: [RouteRow[], { routeId: string; unitType: string }[]]) => {
        if (cancelled) return;
        setRows(catalog);
        setSelected(new Set(assignedPairs.map((p) => `${p.routeId}:${p.unitType}`)));
        setIsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setIsLoaded(true);
        toast.error("No se pudieron cargar las rutas.");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const originOptions = useMemo(
    () => distinctSorted(rows.map((r) => r.origin)).map((v) => ({ value: v, label: v })),
    [rows]
  );
  const destinationOptions = useMemo(
    () => distinctSorted(rows.map((r) => r.destination)).map((v) => ({ value: v, label: v })),
    [rows]
  );
  const unitTypeOptions = useMemo(() => {
    const present = new Set(rows.map((r) => r.unitType));
    return unitTypes.filter((ut) => present.has(ut.value)).map((ut) => ({ value: ut.value, label: ut.label }));
  }, [rows, unitTypes]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (onlySelected && !selected.has(r.key)) return false;
      if (origin && r.origin !== origin) return false;
      if (destination && r.destination !== destination) return false;
      if (unitType && r.unitType !== unitType) return false;
      const haystack = [r.origin, r.destination, r.destinationState ?? "", unitTypeLabel[r.unitType] ?? r.unitType, r.createdByName ?? ""].join(" ");
      return matchesWords(haystack, search);
    });
  }, [rows, search, origin, destination, unitType, onlySelected, selected, unitTypeLabel]);

  const hasFilters = Boolean(search.trim() || origin || destination || unitType || onlySelected);

  function clearFilters() {
    setSearch("");
    setOrigin("");
    setDestination("");
    setUnitType("");
    setOnlySelected(false);
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    const all = filtered.every((r) => selected.has(r.key));
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((r) => (all ? next.delete(r.key) : next.add(r.key)));
      return next;
    });
  }

  async function handleSave() {
    if (!(await confirm({ ...SAVE_CHANGES, description: "Las rutas del cliente quedarán como las dejaste marcadas." }))) return;
    setIsSaving(true);
    try {
      const body = Array.from(selected).map((key) => {
        const idx = key.indexOf(":");
        return { routeId: key.slice(0, idx), unitType: key.slice(idx + 1) };
      });
      const res = await fetch(clientRoutesEndpoint(clientId), {
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
    <>
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Seleccionar rutas</DialogTitle>
          <DialogDescription>
            Marca las rutas que este cliente va a mover. Las que ya tiene aparecen marcadas.
          </DialogDescription>
        </DialogHeader>

        <div ref={selectContainer} className="space-y-3 border-b px-6 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="client-routes-search">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="client-routes-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9"
                autoFocus
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Escribe ciudad, estado o tipo de unidad. Puedes combinar varias palabras, por ejemplo: guadalajara monterrey caja.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <AppSelect value={origin} onValueChange={setOrigin} options={originOptions} container={selectContainer} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label>Destino</Label>
              <AppSelect value={destination} onValueChange={setDestination} options={destinationOptions} container={selectContainer} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de unidad</Label>
              <AppSelect value={unitType} onValueChange={setUnitType} options={unitTypeOptions} container={selectContainer} className="w-full" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="client-routes-only-selected" checked={onlySelected} onCheckedChange={(v) => setOnlySelected(Boolean(v))} />
              <Label htmlFor="client-routes-only-selected">Solo las marcadas</Label>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-xs">
                {isLoaded ? `${filtered.length} de ${rows.length} rutas` : ""}
              </span>
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="size-3.5" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {!isLoaded ? (
            <CardListSkeleton cards={3} lines={1} />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay rutas dadas de alta.</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ninguna ruta coincide con lo que buscas. Prueba con menos palabras o limpia los filtros.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-135 text-sm uppercase">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <th className="w-10 py-2 pl-3 pr-1 text-left">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAll}
                        className="size-4 rounded border-input accent-primary"
                        aria-label="Seleccionar todas las rutas visibles"
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
                  {filtered.map((row) => {
                    const checked = selected.has(row.key);
                    return (
                      <tr
                        key={row.key}
                        onClick={() => toggleRow(row.key)}
                        className={cn(
                          "cursor-pointer border-b last:border-b-0 transition-colors hover:bg-hover hover:text-hover-foreground",
                          checked && "bg-primary/5"
                        )}
                      >
                        <td className="py-2.5 pl-3 pr-1">
                          <input
                            type="checkbox"
                            checked={checked}
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
                        <td className="py-2.5 pr-4 text-muted-foreground">{row.destinationState ?? "—"}</td>
                        <td className="py-2.5 pr-4">{unitTypeLabel[row.unitType] ?? row.unitType}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{row.createdByName ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground text-center sm:text-left">
            {selected.size} ruta{selected.size !== 1 ? "s" : ""} marcada{selected.size !== 1 ? "s" : ""}
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
    </>
  );
}
