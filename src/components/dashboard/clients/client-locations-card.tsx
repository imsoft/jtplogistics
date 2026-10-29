"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, MoveRight, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardListSkeleton } from "@/components/ui/skeletons";
import type { AssignedRoute } from "./client-routes";

type Kind = "origin" | "destination";
interface Row {
  /** Solo para la lista en pantalla. */
  key: string;
  routeId: string;
  kind: Kind;
  address: string;
}

let seq = 0;
const newKey = () => `n${++seq}`;

/**
 * Direcciones de carga y entrega del cliente, agrupadas por ruta: cada ciudad
 * puede tener varias. Al registrar un embarque se ofrecen las de esa ruta.
 */
export function ClientLocationsCard({ clientId, routes, loaded, canEdit }: { clientId: string; routes: AssignedRoute[]; loaded: boolean; canEdit: boolean }) {
  // Una ruta puede venir repetida por tipo de unidad: se agrupa por la ruta.
  const groups = useMemo(() => {
    const map = new Map<string, { routeId: string; origin: string; destination: string }>();
    for (const r of routes) if (!map.has(r.id)) map.set(r.id, { routeId: r.id, origin: r.origin, destination: r.destination });
    return [...map.values()].sort((a, b) => `${a.origin} ${a.destination}`.localeCompare(`${b.origin} ${b.destination}`, "es"));
  }, [routes]);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/locations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { routeId: string | null; kind: Kind; address: string }[]) => {
        const loadedRows = list.filter((l) => l.routeId).map((l) => ({ key: newKey(), routeId: l.routeId!, kind: l.kind, address: l.address }));
        setRows(loadedRows);
        setSaved(JSON.stringify(loadedRows.map(({ routeId, kind, address }) => [routeId, kind, address])));
      })
      .catch(() => setRows([]));
  }, [clientId]);

  const snapshot = JSON.stringify((rows ?? []).filter((r) => r.address.trim()).map(({ routeId, kind, address }) => [routeId, kind, address.trim()]));
  const dirty = rows !== null && snapshot !== saved;

  const update = (key: string, address: string) => setRows((l) => l?.map((r) => (r.key === key ? { ...r, address } : r)) ?? l);
  const add = (routeId: string, kind: Kind) => setRows((l) => [...(l ?? []), { key: newKey(), routeId, kind, address: "" }]);
  const remove = (key: string) => setRows((l) => l?.filter((r) => r.key !== key) ?? l);

  async function save() {
    if (!rows) return;
    setBusy(true);
    try {
      const locations = rows.filter((r) => r.address.trim()).map(({ routeId, kind, address }) => ({ routeId, kind, address: address.trim() }));
      const res = await fetch(`/api/clients/${clientId}/locations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudieron guardar.");
      setSaved(JSON.stringify(locations.map(({ routeId, kind, address }) => [routeId, kind, address])));
      toast.success("Direcciones guardadas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar.");
    } finally {
      setBusy(false);
    }
  }

  const column = (routeId: string, kind: Kind, city: string) => {
    const list = (rows ?? []).filter((r) => r.routeId === routeId && r.kind === kind);
    return (
      <div className="min-w-0 space-y-2">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {kind === "origin" ? "Origen" : "Destino"} · {city}
        </p>
        {list.length === 0 && !canEdit && <p className="text-muted-foreground text-sm">Sin dirección.</p>}
        {list.map((r, i) => (
          <div key={r.key} className="flex items-center gap-2">
            {canEdit ? (
              <>
                <Input
                  aria-label={`Dirección ${i + 1} de ${kind === "origin" ? "origen" : "destino"} en ${city}`}
                  value={r.address}
                  onChange={(e) => update(r.key, e.target.value)}
                />
                <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Quitar dirección" onClick={() => remove(r.key)}>
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </>
            ) : (
              <p className="text-sm">{r.address}</p>
            )}
          </div>
        ))}
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={() => add(routeId, kind)}>
            <Plus className="size-4" />
            Agregar dirección
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Direcciones de origen y destino</CardTitle>
        <MapPin className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-xs">
          Por cada ruta, dónde se carga y dónde se entrega; una ciudad puede tener varias. Al registrar un embarque de esa ruta se ofrecen para elegir.
        </p>
        {!loaded || rows === null ? (
          <CardListSkeleton />
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">Asígnale rutas para capturar sus direcciones.</p>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.routeId} className="rounded-md border">
                <div className="bg-primary/[0.07] text-primary flex items-center gap-1.5 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                  {g.origin}
                  <MoveRight className="size-3.5" />
                  {g.destination}
                </div>
                <div className="grid gap-5 p-4 lg:grid-cols-2">
                  {column(g.routeId, "origin", g.origin)}
                  {column(g.routeId, "destination", g.destination)}
                </div>
              </div>
            ))}
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={save} disabled={busy || !dirty}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Guardar direcciones
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
