"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardListSkeleton } from "@/components/ui/skeletons";
import type { AssignedRoute } from "./client-routes";

type Kind = "origin" | "destination";
const key = (kind: Kind, city: string) => `${kind}|${city.trim().toLowerCase()}`;

/**
 * Direcciones de carga y entrega del cliente: una por cada ciudad de origen y
 * de destino de sus rutas asignadas. El embarque las propone al elegir la ruta.
 */
export function ClientLocationsCard({ clientId, routes, loaded, canEdit }: { clientId: string; routes: AssignedRoute[]; loaded: boolean; canEdit: boolean }) {
  const cities = useMemo(() => {
    const uniq = (list: string[]) => [...new Map(list.filter(Boolean).map((c) => [c.trim().toLowerCase(), c.trim()])).values()].sort((a, b) => a.localeCompare(b, "es"));
    return { origin: uniq(routes.map((r) => r.origin)), destination: uniq(routes.map((r) => r.destination)) };
  }, [routes]);

  const [saved, setSaved] = useState<Record<string, string> | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/clients/${clientId}/locations`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { kind: Kind; city: string; address: string }[]) => {
        const map = Object.fromEntries(rows.map((r) => [key(r.kind, r.city), r.address]));
        setSaved(map);
        setDraft(map);
      })
      .catch(() => setSaved({}));
  }, [clientId]);

  const dirty = saved !== null && Object.keys({ ...saved, ...draft }).some((k) => (saved[k] ?? "") !== (draft[k] ?? ""));

  async function save() {
    setBusy(true);
    try {
      const locations = (["origin", "destination"] as Kind[]).flatMap((kind) =>
        cities[kind].map((city) => ({ kind, city, address: draft[key(kind, city)] ?? "" }))
      );
      const res = await fetch(`/api/clients/${clientId}/locations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudieron guardar.");
      setSaved({ ...draft });
      toast.success("Direcciones guardadas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar.");
    } finally {
      setBusy(false);
    }
  }

  const section = (kind: Kind, title: string) => (
    <div className="space-y-2">
      <p className="text-primary text-xs font-semibold uppercase tracking-wide">{title} ({cities[kind].length})</p>
      {cities[kind].length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin rutas asignadas.</p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-xs font-medium tracking-wide">
            <thead>
              <tr className="bg-primary/[0.07] border-b">
                <th className="text-primary w-1/3 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Ciudad</th>
                <th className="text-primary px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Dirección</th>
              </tr>
            </thead>
            <tbody>
              {cities[kind].map((city) => {
                const k = key(kind, city);
                return (
                  <tr key={k} className="border-b align-middle last:border-0">
                    <td className="px-3 py-2">{city}</td>
                    <td className="px-3 py-2" data-export={draft[k] ?? ""}>
                      {canEdit ? (
                        <Input
                          aria-label={`Dirección de ${kind === "origin" ? "origen" : "destino"} en ${city}`}
                          value={draft[k] ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                        />
                      ) : (
                        <span className={draft[k] ? "" : "text-muted-foreground"}>{draft[k] || "—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Direcciones de origen y destino</CardTitle>
        <MapPin className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-xs">
          Dónde se carga y dónde se entrega en cada ciudad de sus rutas. Al registrar un embarque de este cliente, se proponen solas.
        </p>
        {!loaded || saved === null ? (
          <CardListSkeleton />
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              {section("origin", "Orígenes")}
              {section("destination", "Destinos")}
            </div>
            {canEdit && (cities.origin.length > 0 || cities.destination.length > 0) && (
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
