"use client";

import { useState } from "react";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PendingRequest {
  id: string;
  origin: string;
  destination: string;
  unitType: string;
}

export function CarrierRouteUnlockRequests({
  carrierId,
  initialRequests,
}: {
  carrierId: string;
  initialRequests: PendingRequest[];
}) {
  const [requests, setRequests] = useState<PendingRequest[]>(initialRequests);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDecision(carrierRouteId: string, approved: boolean) {
    setLoadingId(carrierRouteId);
    try {
      const res = await fetch(`/api/admin/carrier-routes/${carrierRouteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error();
      toast.success(approved ? "Edición aprobada." : "Solicitud rechazada.");
      setRequests((prev) => prev.filter((r) => r.id !== carrierRouteId));
    } catch {
      toast.error("No se pudo procesar la solicitud. Intenta de nuevo.");
    } finally {
      setLoadingId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="border-b border-amber-200 px-4 py-2.5 dark:border-amber-900/50">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
          Solicitudes de edición pendientes ({requests.length})
        </p>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
        {requests.map((r) => {
          const isLoading = loadingId === r.id;
          return (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-medium">
                  <span className="truncate">{r.origin}</span>
                  <MoveRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{r.destination}</span>
                </p>
                <p className="text-xs text-muted-foreground">{r.unitType}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => handleDecision(r.id, false)}
                  className="h-7 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  {isLoading ? "…" : "Rechazar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleDecision(r.id, true)}
                  className="h-7"
                >
                  {isLoading ? "…" : "Aprobar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
