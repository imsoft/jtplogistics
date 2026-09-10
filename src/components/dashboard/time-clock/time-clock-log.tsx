"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, MonitorSmartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Mark = "clock_in" | "lunch_start" | "lunch_end" | "clock_out";

const COLUMNS: { mark: Mark; label: string }[] = [
  { mark: "clock_in", label: "Entrada" },
  { mark: "lunch_start", label: "Comida" },
  { mark: "lunch_end", label: "Regreso" },
  { mark: "clock_out", label: "Salida" },
];

interface MarkData {
  at: string;
  distanceM: number | null;
  geoStatus: string | null;
}

interface Row {
  workDate: string;
  userId: string;
  userName: string;
  marks: Partial<Record<Mark, MarkData>>;
  ips: string[];
  devices: string[];
  reasons: string[];
}

function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Mexico_City",
  });
}

/** Hoy en la zona de la empresa, en formato de <input type="date">. */
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function TimeClockLog() {
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    fetch(`/api/time-clock/log?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { rows: Row[] }) => setRows(d.rows))
      .catch(() => { setRows([]); setError("No se pudo cargar el registro."); });
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Registro del checador</h1>
        <p className="text-muted-foreground text-sm">
          Lo que marcó cada colaborador. Solo lectura: las checadas no se editan.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="tc-from">Desde</Label>
          <Input
            id="tc-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tc-to">Hasta</Label>
          <Input
            id="tc-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm font-medium">{error}</p>}

      {rows === null ? (
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">Nadie marcó en esas fechas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left font-medium">Colaborador</th>
                <th className="px-4 py-2 text-left font-medium">Jornada</th>
                {COLUMNS.map((c) => (
                  <th key={c.mark} className="px-4 py-2 text-left font-medium">{c.label}</th>
                ))}
                <th className="px-4 py-2 text-left font-medium">Señales</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.workDate}-${row.userId}`} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.userName}</td>
                  <td className="text-muted-foreground px-4 py-2.5 tabular-nums">{row.workDate}</td>
                  {COLUMNS.map((c) => {
                    const m = row.marks[c.mark];
                    return (
                      <td key={c.mark} className="px-4 py-2.5">
                        {m ? (
                          <span className="flex flex-col">
                            <span className="font-semibold tabular-nums">{hhmm(m.at)}</span>
                            {m.distanceM !== null && (
                              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                <MapPin className="size-3" />{m.distanceM} m
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5">
                    <span className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                      {row.ips.length > 0 && <span>{row.ips.join(", ")}</span>}
                      {row.devices.length > 1 && (
                        <span className="flex items-center gap-1">
                          <MonitorSmartphone className="size-3" />
                          {row.devices.length} equipos
                        </span>
                      )}
                      {row.reasons.map((r, i) => (
                        <span key={i} className="text-foreground">{r}</span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Fase 1: aquí todavía no se calculan retardos ni faltas. Se está juntando el
        histórico que la fase 2 necesita para saber cuál es la conexión de la oficina.
      </p>
    </div>
  );
}
