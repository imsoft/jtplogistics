"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, LogIn, LogOut, UtensilsCrossed, Undo2, Loader2, MapPin, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getDeviceId } from "@/lib/device-id";
import { readLocation } from "@/lib/geo-reading";

type Mark = "clock_in" | "lunch_start" | "lunch_end" | "clock_out";

const MARK_LABELS: Record<Mark, string> = {
  clock_in: "Entrada",
  lunch_start: "Salida a comida",
  lunch_end: "Regreso de comida",
  clock_out: "Salida",
};

const MARK_ICONS: Record<Mark, React.ElementType> = {
  clock_in: LogIn,
  lunch_start: UtensilsCrossed,
  lunch_end: Undo2,
  clock_out: LogOut,
};

interface Entry {
  id: string;
  mark: Mark;
  markedAt: string;
  distanceM: number | null;
  geoStatus: string | null;
  reason: string | null;
}

interface Standing {
  retardos: number;
  faltas: number;
  isProspecto: boolean;
  nextExpiry: string | null;
}

interface State {
  workDate: string;
  lastMark: Mark | null;
  allowed: Mark[];
  schedule: { startMinute: number; endMinute: number } | null;
  standing: Standing;
  entries: Entry[];
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

function longDate(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * El panel de marcado. Se usa completo en la pantalla del checador y compacto
 * en el inicio, para que marcar entrada no obligue a navegar a ningún lado.
 */
export function PunchPanel({ variant = "full" }: { variant?: "full" | "compact" }) {
  const [state, setState] = useState<State | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [pending, setPending] = useState<Mark | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cuando el servidor pide explicación, la marca queda esperando el motivo.
  const [askingFor, setAskingFor] = useState<Mark | null>(null);
  const [reason, setReason] = useState("");

  // El reloj de pantalla es solo para el colaborador: late cada segundo para
  // que se vea vivo. La hora que cuenta la pone el servidor al registrar la
  // marca, así que este puede ir unos segundos corrido sin consecuencia.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(() => {
    fetch("/api/time-clock")
      .then((r) => r.json())
      .then((d: State) => setState(d))
      .catch(() => setError("No se pudo cargar tu jornada."));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function punch(mark: Mark, withReason?: string) {
    setError(null);
    setPending(mark);
    try {
      // La ubicación se pide aquí y no al abrir la pantalla: así el permiso se
      // asocia a una acción que el colaborador entiende.
      const geo = await readLocation();
      const res = await fetch("/api/time-clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mark,
          deviceId: getDeviceId(),
          geoStatus: geo.status,
          latitude: geo.latitude,
          longitude: geo.longitude,
          accuracy: geo.accuracy,
          ...(withReason ? { reason: withReason } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        reasonRequired?: boolean;
      };
      if (!res.ok) {
        if (data.reasonRequired) {
          // No es un error: es la regla pidiendo que dé la cara en el momento.
          setAskingFor(mark);
          setReason("");
        }
        setError(data.error ?? "No se pudo registrar la marca.");
        return;
      }
      setAskingFor(null);
      setReason("");
      load();
    } catch {
      setError("Error de conexión. No se registró la marca.");
    } finally {
      setPending(null);
    }
  }

  const isCompact = variant === "compact";

  if (!state) {
    return isCompact ? (
      <Skeleton className="h-32 w-full" />
    ) : (
      <div className="min-w-0 space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  const done = new Set(state.entries.map((e) => e.mark));
  const shiftClosed = state.lastMark === "clock_out";

  return (
    <div className="min-w-0 space-y-6">
      {!isCompact && (
        <div>
          <h1 className="page-heading">Checador</h1>
          <p className="text-muted-foreground text-sm">
            Jornada del {longDate(state.workDate)}.
          </p>
        </div>
      )}

      <Card>
        <CardContent className={`flex flex-col items-center gap-5 ${isCompact ? "py-5" : "py-8"}`}>
          <div className="text-center">
            {!isCompact && <Clock className="text-muted-foreground mx-auto mb-2 size-6" />}
            {isCompact && (
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Checador</p>
            )}
            <p
              className={`font-bold tabular-nums tracking-tight ${
                isCompact ? "text-3xl" : "text-4xl"
              }`}
            >
              {now
                ? now.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                    timeZone: "America/Mexico_City",
                  })
                : "--:--:--"}
            </p>
          </div>

          {shiftClosed ? (
            <p className="text-muted-foreground text-center text-sm">
              Ya cerraste tu jornada de hoy. Tu siguiente entrada abre una nueva.
            </p>
          ) : askingFor ? (
            <div className="flex w-full flex-col gap-3 sm:max-w-sm">
              <p className="text-sm font-medium">{error}</p>
              <div className="space-y-2">
                <Label htmlFor="tc-reason">Motivo</Label>
                <Textarea
                  id="tc-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Queda guardado junto a tu marca y ya no se puede editar.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setAskingFor(null); setReason(""); setError(null); }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  disabled={pending !== null || !reason.trim()}
                  onClick={() => punch(askingFor, reason.trim())}
                >
                  {pending !== null && <Loader2 className="size-4 animate-spin" />}
                  Registrar {MARK_LABELS[askingFor].toLowerCase()}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-2 sm:max-w-sm">
              {state.allowed.map((mark) => {
                const Icon = MARK_ICONS[mark];
                const isPrimary = mark === state.allowed[0];
                return (
                  <Button
                    key={mark}
                    size="lg"
                    variant={isPrimary ? "default" : "outline"}
                    disabled={pending !== null}
                    onClick={() => punch(mark)}
                  >
                    {pending === mark ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                    {pending === mark ? "Registrando…" : MARK_LABELS[mark]}
                  </Button>
                );
              })}
            </div>
          )}

          {error && !askingFor && (
            <p className="text-destructive text-center text-sm font-medium">{error}</p>
          )}
        </CardContent>
      </Card>

      {isCompact && (
        <p className="text-muted-foreground text-center text-xs">
          <Link href="/collaborator/dashboard/time-clock" className="underline">
            Ver mis marcas de hoy
          </Link>
        </p>
      )}

      {!isCompact && (state.standing.retardos > 0 || state.standing.faltas > 0) && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Retardos</p>
              <p className="text-2xl font-bold tabular-nums">{state.standing.retardos} de 3</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Faltas</p>
              <p className="text-2xl font-bold tabular-nums">{state.standing.faltas} de 3</p>
            </div>
            <div className="min-w-0 flex-1">
              {state.standing.isProspecto ? (
                <p className="text-destructive flex items-start gap-2 text-sm font-medium">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  Acumulaste 3 faltas. Acércate con Recursos Humanos.
                </p>
              ) : state.standing.nextExpiry ? (
                <p className="text-muted-foreground text-sm">
                  Tu retardo más viejo deja de contar el{" "}
                  <strong className="text-foreground">{longDate(state.standing.nextExpiry)}</strong>.
                  Cada uno caduca a los 30 días.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {!isCompact && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
            Tus marcas de esta jornada
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="divide-y">
            {(["clock_in", "lunch_start", "lunch_end", "clock_out"] as Mark[]).map((mark) => {
              const entry = state.entries.find((e) => e.mark === mark);
              const Icon = MARK_ICONS[mark];
              return (
                <div key={mark} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon
                      className={`size-4 shrink-0 ${done.has(mark) ? "text-foreground" : "text-muted-foreground/50"}`}
                    />
                    <span className={`min-w-0 ${done.has(mark) ? "" : "text-muted-foreground"}`}>
                      {MARK_LABELS[mark]}
                      {entry?.reason && (
                        <span className="text-muted-foreground block text-xs">{entry.reason}</span>
                      )}
                    </span>
                  </span>
                  {entry ? (
                    <span className="flex shrink-0 items-center gap-3">
                      {entry.distanceM !== null && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <MapPin className="size-3" />
                          {entry.distanceM} m
                        </span>
                      )}
                      <span className="text-base font-semibold tabular-nums">
                        {hms(entry.markedAt)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground shrink-0 text-sm">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {!isCompact && (
        <p className="text-muted-foreground text-xs">
          La hora la registra el servidor, no tu equipo. Una marca hecha no se puede
          editar ni borrar; si algo salió mal, dirección lo corrige.
        </p>
      )}
    </div>
  );
}
