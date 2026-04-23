"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SHIPMENT_STATUS_CONFIG } from "@/components/dashboard/resources/shipments-table";
import type { ShipmentTimelineEntry } from "@/app/api/admin/shipments/[id]/timeline/route";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ShipmentTimelineProps {
  shipmentId: string;
}

export function ShipmentTimeline({ shipmentId }: ShipmentTimelineProps) {
  const [entries, setEntries] = useState<ShipmentTimelineEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/shipments/${shipmentId}/timeline`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ShipmentTimelineEntry[]) => { setEntries(data); setIsLoaded(true); })
      .catch(() => setIsLoaded(true));
  }, [shipmentId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Línea de tiempo
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-5">
        {!isLoaded ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin historial de estados.</p>
        ) : (
          <ol className="relative border-l border-border ml-2">
            {entries.map((entry, i) => {
              const isLast = i === entries.length - 1;
              const cfg = SHIPMENT_STATUS_CONFIG[entry.status as keyof typeof SHIPMENT_STATUS_CONFIG];
              return (
                <li key={i} className={`ml-5 ${isLast ? "" : "pb-6"}`}>
                  {/* Dot */}
                  <span
                    className={`absolute -left-[9px] flex size-4 items-center justify-center rounded-full ring-2 ring-background ${isLast ? "bg-primary" : "bg-muted"}`}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg?.badgeClass ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {cfg?.label ?? entry.status}
                    </span>
                    {isLast && (
                      <span className="text-xs font-medium text-primary">Estado actual</span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmtDateTime(entry.at)}
                    {" · "}
                    {entry.by}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
