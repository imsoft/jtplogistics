"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, MoveRight, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardListSkeleton } from "@/components/ui/skeletons";
import type { AssignedRoute } from "./client-routes";
import { SAVE_CHANGES, useConfirm } from "@/components/ui/confirm-provider";

interface Pair {
  /** Solo para la lista en pantalla. */
  key: string;
  routeId: string;
  originAddress: string;
  destinationAddress: string;
}

let seq = 0;
const newKey = () => `p${++seq}`;

const snapshotOf = (pairs: Pair[]) =>
  JSON.stringify(
    pairs
      .filter((p) => p.originAddress.trim() || p.destinationAddress.trim())
      .map((p) => [p.routeId, p.originAddress.trim(), p.destinationAddress.trim()])
  );

/**
 * Direcciones del cliente por ruta, en pares: dónde se carga y dónde se
 * entrega. Al registrar un embarque se elige la de carga y la de entrega sale
 * sola.
 */
export function ClientLocationsCard({ clientId, routes, loaded, canEdit }: { clientId: string; routes: AssignedRoute[]; loaded: boolean; canEdit: boolean }) {
  const confirm = useConfirm();
  // Una ruta puede venir repetida por tipo de unidad: se agrupa por la ruta.
  const groups = useMemo(() => {
    const map = new Map<string, { routeId: string; origin: string; destination: string }>();
    for (const r of routes) if (!map.has(r.id)) map.set(r.id, { routeId: r.id, origin: r.origin, destination: r.destination });
    return [...map.values()].sort((a, b) => `${a.origin} ${a.destination}`.localeCompare(`${b.origin} ${b.destination}`, "es"));
  }, [routes]);

  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/address-pairs`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { routeId: string; originAddress: string; destinationAddress: string }[]) => {
        const loadedPairs = list.map((p) => ({ key: newKey(), routeId: p.routeId, originAddress: p.originAddress, destinationAddress: p.destinationAddress }));
        setPairs(loadedPairs);
        setSaved(snapshotOf(loadedPairs));
      })
      .catch(() => setPairs([]));
  }, [clientId]);

  const dirty = pairs !== null && snapshotOf(pairs) !== saved;

  const update = (key: string, field: "originAddress" | "destinationAddress", value: string) =>
    setPairs((l) => l?.map((p) => (p.key === key ? { ...p, [field]: value } : p)) ?? l);
  const add = (routeId: string) => setPairs((l) => [...(l ?? []), { key: newKey(), routeId, originAddress: "", destinationAddress: "" }]);
  const remove = (key: string) => setPairs((l) => l?.filter((p) => p.key !== key) ?? l);

  async function save() {
    if (!pairs) return;
    const filled = pairs.filter((p) => p.originAddress.trim() || p.destinationAddress.trim());
    if (filled.some((p) => !p.originAddress.trim() || !p.destinationAddress.trim())) {
      toast.error("Cada par necesita la dirección de carga y la de entrega.");
      return;
    }
    if (!(await confirm({ ...SAVE_CHANGES, description: "Las direcciones del cliente quedarán como las capturaste." }))) return;
    setBusy(true);
    try {
      const body = filled.map((p) => ({ routeId: p.routeId, originAddress: p.originAddress.trim(), destinationAddress: p.destinationAddress.trim() }));
      const res = await fetch(`/api/clients/${clientId}/address-pairs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs: body }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudieron guardar.");
      setSaved(snapshotOf(filled));
      toast.success("Direcciones guardadas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Direcciones de carga y entrega</CardTitle>
        <MapPin className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-xs">
          Por cada ruta, pares de dónde se carga y dónde se entrega. Al registrar un embarque se elige la de carga y la de entrega sale sola.
        </p>
        {!loaded || pairs === null ? (
          <CardListSkeleton />
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">Asígnale rutas para capturar sus direcciones.</p>
        ) : (
          <>
            {groups.map((g) => {
              const list = pairs.filter((p) => p.routeId === g.routeId);
              return (
                <div key={g.routeId} className="rounded-md border">
                  <div className="bg-primary/[0.07] text-primary flex items-center gap-1.5 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    {g.origin}
                    <MoveRight className="size-3.5" />
                    {g.destination}
                  </div>
                  <div className="space-y-3 p-4">
                    {list.length > 0 && (
                      <div className="text-muted-foreground hidden grid-cols-[1fr_auto_1fr_auto] gap-2 text-xs font-semibold uppercase tracking-wide sm:grid">
                        <span>Carga · {g.origin}</span>
                        <span className="w-4" />
                        <span>Entrega · {g.destination}</span>
                        <span className="w-9" />
                      </div>
                    )}
                    {list.length === 0 && <p className="text-muted-foreground text-sm">Sin direcciones.</p>}
                    {list.map((p, i) =>
                      canEdit ? (
                        <div key={p.key} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
                          <Input
                            aria-label={`Dirección de carga ${i + 1} en ${g.origin}`}
                            value={p.originAddress}
                            onChange={(e) => update(p.key, "originAddress", e.target.value)}
                          />
                          <MoveRight className="text-muted-foreground hidden size-4 sm:block" aria-hidden />
                          <Input
                            aria-label={`Dirección de entrega ${i + 1} en ${g.destination}`}
                            value={p.destinationAddress}
                            onChange={(e) => update(p.key, "destinationAddress", e.target.value)}
                            className="col-start-1 sm:col-start-auto"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="row-span-2 row-start-1 col-start-2 shrink-0 sm:row-span-1 sm:col-start-auto"
                            aria-label={`Quitar par ${i + 1}`}
                            onClick={() => remove(p.key)}
                          >
                            <Trash2 className="text-destructive size-4" />
                          </Button>
                        </div>
                      ) : (
                        <p key={p.key} className="flex flex-wrap items-center gap-1.5 text-sm">
                          {p.originAddress}
                          <MoveRight className="text-muted-foreground size-3.5" aria-hidden />
                          {p.destinationAddress}
                        </p>
                      )
                    )}
                    {canEdit && (
                      <Button type="button" variant="outline" size="sm" onClick={() => add(g.routeId)}>
                        <Plus className="size-4" />
                        Agregar par de direcciones
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
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
