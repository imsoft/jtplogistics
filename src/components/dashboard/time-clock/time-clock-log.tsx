"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, MonitorSmartphone, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CorrectionDialog } from "@/components/dashboard/time-clock/correction-dialog";

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
  outsideGeofence: boolean | null;
  foreignNetwork: boolean | null;
  sharedDevice: boolean | null;
  entryId: string;
}

interface Correction {
  kind: "adjust" | "void" | "add" | null;
  reason: string | null;
  by: string | null;
}

const CORRECTION_LABELS: Record<string, string> = {
  adjust: "Hora corregida",
  void: "Marca anulada",
  add: "Marca agregada",
};

interface Flag {
  kind: "retardo" | "falta" | "comida_larga" | "sin_comida";
  minutesLate: number | null;
}

const FLAG_LABELS: Record<Flag["kind"], string> = {
  retardo: "Retardo",
  falta: "Falta",
  comida_larga: "Comida larga",
  sin_comida: "Sin marcar comida",
};

/** El color dice la gravedad; la falta es lo único que escala a baja. */
const FLAG_TONE: Record<Flag["kind"], string> = {
  retardo: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  falta: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  comida_larga: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  sin_comida: "bg-muted text-muted-foreground",
};

interface Row {
  workDate: string;
  userId: string;
  userName: string;
  marks: Partial<Record<Mark, MarkData>>;
  ips: string[];
  devices: string[];
  reasons: string[];
  flags: Flag[];
  corrections: Correction[];
}

/** La hora de una marca, al segundo: es lo que quedó registrado. */
function hms(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

/** Dirección corrige; RH solo mira. El servidor lo vuelve a revisar. */
export function TimeClockLog({ canCorrect = false }: { canCorrect?: boolean }) {
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    fetch(`/api/time-clock/log?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { rows: Row[]; holidays?: { date: string; name: string }[] }) => {
        setHolidays(new Map((d.holidays ?? []).map((h) => [h.date, h.name])));
        setRows(d.rows);
      })
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
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left font-medium">Colaborador</th>
                <th className="px-4 py-2 text-left font-medium">Jornada</th>
                {COLUMNS.map((c) => (
                  <th key={c.mark} className="px-4 py-2 text-left font-medium">{c.label}</th>
                ))}
                <th className="px-4 py-2 text-left font-medium">Anotaciones</th>
                <th className="px-4 py-2 text-left font-medium">Señales</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.workDate}-${row.userId}`} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {row.userName}
                    {row.corrections.map((c, i) => (
                      <span key={i} className="text-muted-foreground block text-xs font-normal">
                        {c.kind ? CORRECTION_LABELS[c.kind] : "Corregido"}
                        {c.by ? ` por ${c.by}` : ""}: {c.reason}
                      </span>
                    ))}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 tabular-nums">
                    {row.workDate}
                    {holidays.has(row.workDate) && (
                      <span className="text-foreground bg-muted mt-1 block w-fit rounded px-1.5 py-0.5 text-xs font-medium">
                        Festivo: {holidays.get(row.workDate)}
                      </span>
                    )}
                  </td>
                  {COLUMNS.map((c) => {
                    const m = row.marks[c.mark];
                    return (
                      <td key={c.mark} className="px-4 py-2.5">
                        {m ? (
                          <span className="flex flex-col">
                            <span className="font-semibold tabular-nums">{hms(m.at)}</span>
                            {m.distanceM !== null && (
                              <span
                                className={`flex items-center gap-1 text-xs ${
                                  m.outsideGeofence ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                                }`}
                              >
                                <MapPin className="size-3" />{m.distanceM} m
                              </span>
                            )}
                            {m.foreignNetwork && (
                              <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                <WifiOff className="size-3" />Otra conexión
                              </span>
                            )}
                            {m.sharedDevice && (
                              <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                <MonitorSmartphone className="size-3" />Equipo compartido
                              </span>
                            )}
                            {canCorrect && (
                              <CorrectionDialog
                                entryId={m.entryId}
                                personName={row.userName}
                                markLabel={c.label}
                                currentTime={m.at}
                                onDone={load}
                              />
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5">
                    {row.flags.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {row.flags.map((f, i) => (
                          <span
                            key={i}
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${FLAG_TONE[f.kind]}`}
                          >
                            {FLAG_LABELS[f.kind]}
                            {f.minutesLate !== null && f.minutesLate > 0 && ` ${f.minutesLate} min`}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
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
        Los retardos y las faltas se calculan contra el horario que tenga capturado
        cada quien: sin horario, no se le anota nada. Todo caduca a los 30 días. Las
        horas que se ven son las ya corregidas; las originales siguen guardadas.
      </p>
    </div>
  );
}
