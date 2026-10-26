"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoRow } from "@/components/dashboard/users/info-row";
import { SCT_PERMITS, TRAILER_SUBTYPES, VEHICLE_CONFIGS, labelOf } from "@/lib/sat-catalogs";
import type { CartaPorteSnapshot } from "@/lib/shipment-billing";
import { shortDay } from "./billing-shared";

/**
 * Los datos de Carta Porte que se tomaron del embarque y del expediente del
 * transportista. En el borrador se pueden volver a tomar si ya se completaron.
 */
export function CartaPorteCard({
  documentId,
  data,
  canRefresh,
  onRefreshed,
}: {
  documentId: string;
  data: CartaPorteSnapshot;
  canRefresh: boolean;
  onRefreshed: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshCartaPorte: true }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string; missing?: string[] };
      if (!res.ok) throw new Error(d.error ?? "No se pudo actualizar.");
      toast.success(d.missing?.length ? "Actualizado. Todavía faltan datos." : "Actualizado: ya está completa.");
      onRefreshed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setBusy(false);
    }
  }

  const v = data.vehicle;
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-2 sm:flex-row">
        <CardTitle className="text-base">Datos de Carta Porte</CardTitle>
        {canRefresh && (
          <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Actualizar del embarque
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {data.missing.length > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium">Para timbrar la Carta Porte falta:</p>
            <ul className="text-muted-foreground mt-1 list-disc pl-5">
              {data.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm font-medium">Completa: lista para timbrar cuando esté el PAC.</p>
        )}
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            <InfoRow label="Origen" value={data.origin} />
            <InfoRow label="Destino" value={data.destination} />
            <InfoRow label="Producto" value={data.product} />
            <InfoRow label="Recolección" value={data.pickupDate ? shortDay(data.pickupDate) : null} />
            <InfoRow label="Entrega" value={data.deliveryDate ? shortDay(data.deliveryDate) : null} />
            <InfoRow label="Transportista" value={data.carrier.name} />
            <InfoRow label="RFC del transportista" value={data.carrier.rfc} />
          </div>
          <div>
            <InfoRow label="Tracto" value={v ? [v.plates, v.label, v.year].filter(Boolean).join(" · ") : null} />
            <InfoRow label="Configuración" value={labelOf(VEHICLE_CONFIGS, v?.vehicleConfig)} />
            <InfoRow label="Permiso SCT" value={v?.sctPermitType ? `${labelOf(SCT_PERMITS, v.sctPermitType)} · ${v.sctPermitNumber ?? ""}` : null} />
            <InfoRow label="Seguro" value={v?.insurer ? `${v.insurer} · ${v.policyNumber ?? ""}` : null} />
            <InfoRow label="Caja" value={data.trailer ? `${data.trailer.plates} · ${labelOf(TRAILER_SUBTYPES, data.trailer.trailerSubtype) ?? ""}` : null} />
            <InfoRow label="Operador" value={data.operator?.name} />
            <InfoRow label="RFC y licencia" value={data.operator ? [data.operator.rfc, data.operator.licenseNumber].filter(Boolean).join(" · ") : null} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
