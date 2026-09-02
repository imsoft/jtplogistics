"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAINTENANCE_KIND_LABELS, MAINTENANCE_STATUS_LABELS } from "@/lib/support";

/**
 * Lo mínimo que el calendario necesita de un mantenimiento. Se declara aquí en
 * vez de importar el tipo del panel de soporte para que también lo pueda usar
 * la bitácora de calidad, que trae los mismos datos con otra forma.
 */
export interface CalendarMaintenance {
  id: string;
  kind: keyof typeof MAINTENANCE_KIND_LABELS;
  status: keyof typeof MAINTENANCE_STATUS_LABELS;
  description: string;
  findings: string | null;
  recipientName: string | null;
  scheduledFor: string;
  performedAt: string | null;
  photos: { url: string }[] | null;
  laptop: { name: string } | null;
  phone: { name: string } | null;
  technician: { name: string };
  ticket: { title: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-muted text-muted-foreground",
};

/** El color de la píldora dentro del día. */
const CHIP_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-900 hover:bg-blue-200",
  done: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  cancelled: "bg-muted text-muted-foreground hover:bg-muted/80",
};

const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

/**
 * El día que le toca a un mantenimiento en el calendario: el realmente hecho
 * si ya se cerró, y si no, el que está agendado.
 */
function dayKey(m: CalendarMaintenance): string {
  return (m.status === "done" && m.performedAt ? m.performedAt : m.scheduledFor).slice(0, 10);
}

/** "2026-08-31" sin pasar por la zona horaria del navegador. */
function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatLongDay(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${iso}T00:00:00Z`));
}

/**
 * Calendario mensual de mantenimientos: los programados y los ya hechos, cada
 * uno en su día. Al picar uno se abre su información sin salir del calendario.
 */
export function MaintenanceCalendar({
  items,
  detailBasePath,
}: {
  items: CalendarMaintenance[];
  /** Base de la ficha completa. Sin ella, el modal no ofrece abrirla. */
  detailBasePath?: string;
}) {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getUTCFullYear());
  const [month, setMonth] = useState(hoy.getUTCMonth());
  const [selected, setSelected] = useState<CalendarMaintenance | null>(null);

  const porDia = useMemo(() => {
    const mapa = new Map<string, CalendarMaintenance[]>();
    for (const m of items) {
      const key = dayKey(m);
      const bucket = mapa.get(key);
      if (bucket) bucket.push(m);
      else mapa.set(key, [m]);
    }
    return mapa;
  }, [items]);

  /**
   * Las celdas del mes, incluidas las vacías del inicio para que el día 1 caiga
   * en su columna. La semana arranca en lunes, como se lee aquí.
   */
  const celdas = useMemo(() => {
    const primero = new Date(Date.UTC(year, month, 1));
    const desfase = (primero.getUTCDay() + 6) % 7;
    const diasDelMes = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const out: (string | null)[] = Array(desfase).fill(null);
    for (let d = 1; d <= diasDelMes; d++) out.push(isoDay(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month]);

  const etiquetaMes = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));

  const hoyIso = isoDay(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());

  function mover(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  const equipoDe = (m: CalendarMaintenance) =>
    m.laptop?.name ?? m.phone?.name ?? "Equipo dado de baja";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide">{etiquetaMes}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => mover(-1)} aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setYear(hoy.getUTCFullYear());
              setMonth(hoy.getUTCMonth());
            }}
          >
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => mover(1)} aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-blue-200" /> Programado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-emerald-200" /> Realizado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-muted" /> Cancelado
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-160 overflow-hidden rounded-xl border">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-[10px] font-semibold tracking-wide text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celdas.map((iso, i) => {
              const delDia = iso ? porDia.get(iso) ?? [] : [];
              return (
                <div
                  key={iso ?? `vacio-${i}`}
                  className={`min-h-24 border-b border-r p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                    iso ? "" : "bg-muted/20"
                  } ${iso === hoyIso ? "bg-primary/5" : ""}`}
                >
                  {iso && (
                    <>
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
                          iso === hoyIso
                            ? "bg-primary font-bold text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {Number(iso.slice(8, 10))}
                      </span>
                      <div className="mt-1 space-y-1">
                        {delDia.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelected(m)}
                            className={`flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[10px] font-medium leading-tight transition ${CHIP_STYLES[m.status]}`}
                            title={`${equipoDe(m)} — ${m.description}`}
                          >
                            {m.kind === "preventive" ? (
                              <ShieldCheck className="size-3 shrink-0" />
                            ) : (
                              <Wrench className="size-3 shrink-0" />
                            )}
                            <span className="truncate">{equipoDe(m)}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{equipoDe(selected)}</DialogTitle>
                <DialogDescription>
                  {selected.status === "done" && selected.performedAt
                    ? `Realizado el ${formatLongDay(selected.performedAt.slice(0, 10))}`
                    : `Programado para el ${formatLongDay(selected.scheduledFor.slice(0, 10))}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {MAINTENANCE_KIND_LABELS[selected.kind]}
                  </Badge>
                  <Badge className={`text-[10px] ${STATUS_STYLES[selected.status]}`}>
                    {MAINTENANCE_STATUS_LABELS[selected.status]}
                  </Badge>
                </div>

                <Dato label="Responsable" value={selected.technician.name} />
                <Dato label="Se le hizo a" value={selected.recipientName} />
                <Dato
                  label="Programado"
                  value={formatLongDay(selected.scheduledFor.slice(0, 10))}
                />
                {selected.performedAt && (
                  <Dato
                    label="Realizado"
                    value={formatLongDay(selected.performedAt.slice(0, 10))}
                  />
                )}
                {selected.ticket && <Dato label="Nació de un reporte" value={selected.ticket.title} />}

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Qué se hizo
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{selected.description}</p>
                </div>

                {selected.findings && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Qué se encontró
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{selected.findings}</p>
                  </div>
                )}

                {selected.photos && selected.photos.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Evidencia
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.photos.map((p, i) => (
                        <div
                          key={p.url}
                          className="relative size-20 overflow-hidden rounded-lg border"
                        >
                          <Image
                            src={p.url}
                            alt={`Evidencia ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {detailBasePath && (
                  <Button variant="outline" asChild>
                    <Link href={`${detailBasePath}/${selected.id}`}>
                      <ExternalLink className="size-4" />
                      Abrir ficha
                    </Link>
                  </Button>
                )}
                <Button onClick={() => setSelected(null)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Renglón etiqueta/valor del modal; se omite si no hay dato. */
function Dato({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-right">{value}</span>
    </div>
  );
}
