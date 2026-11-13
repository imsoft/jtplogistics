"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquareQuote, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarInput, StarRating } from "@/components/ui/star-rating";
import { SAVE_CHANGES, useConfirm } from "@/components/ui/confirm-provider";
import type { CarrierEvaluations, MonthEvaluation } from "@/lib/carrier-evaluation-server";

/** Qué tan bien va, en palabras: no solo en estrellas. */
export function starsWord(stars: number | null): string {
  if (stars === null) return "Sin calificación";
  if (stars >= 4.5) return "Excelente";
  if (stars >= 4) return "Muy bueno";
  if (stars >= 3) return "Regular";
  if (stars >= 2) return "Deficiente";
  return "Crítico";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v} %`);

/** La calificación general, en grande. */
export function OverallCard({ data, title = "Calificación JTP" }: { data: CarrierEvaluations; title?: string }) {
  const o = data.overall;
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{title}</p>
          <div className="mt-1 flex items-center gap-3">
            <StarRating stars={o.stars} size="lg" />
            <span className="text-3xl font-bold tabular-nums">{o.stars !== null ? o.stars.toFixed(1) : "—"}</span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{starsWord(o.stars)}</p>
          {o.notes && <p className="mt-2 max-w-xl text-sm whitespace-pre-wrap">{o.notes}</p>}
        </div>
        {o.stats && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Stat label="Embarques" value={String(o.stats.total)} />
            <Stat label="Puntualidad" value={pct(o.stats.punctualityScore)} />
            <Stat label="Sin incidencias" value={pct(o.stats.incidentFreeScore)} />
            <Stat label="Entregados" value={pct(o.stats.deliveryRateScore)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * La evaluación de cada mes. `onSave` solo para quien puede ajustarla (admin):
 * estrellas en medias y un comentario que el proveedor ve.
 */
export function MonthlyEvaluations({
  months,
  onSave,
}: {
  months: MonthEvaluation[];
  onSave?: (month: string, stars: number | null, comment: string) => Promise<boolean>;
}) {
  if (months.length === 0) {
    return <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">Todavía no hay embarques para evaluar.</p>;
  }
  return (
    <ol className="space-y-3">
      {months.map((m) => (
        <MonthRow key={m.month} m={m} onSave={onSave} />
      ))}
    </ol>
  );
}

function MonthRow({ m, onSave }: { m: MonthEvaluation; onSave?: (month: string, stars: number | null, comment: string) => Promise<boolean> }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(m.manualStars ?? 0);
  const [comment, setComment] = useState(m.comment ?? "");
  const [busy, setBusy] = useState(false);

  async function save(clear = false) {
    if (!onSave) return;
    // Cambiar una evaluación que ya existía se confirma; la primera no.
    if ((m.manualStars !== null || m.comment) && !(await confirm({ ...SAVE_CHANGES, description: "El proveedor verá la evaluación nueva de este mes." }))) return;
    setBusy(true);
    const ok = await onSave(m.month, clear ? null : stars || null, clear ? "" : comment);
    setBusy(false);
    if (ok) {
      setEditing(false);
      if (clear) {
        setStars(0);
        setComment("");
      }
    }
  }

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{m.label}</p>
          <div className="mt-1 flex items-center gap-2">
            <StarRating stars={m.stars} size="md" showNumber />
            <span className="text-muted-foreground text-xs">
              {m.manualStars !== null ? "Ajustada por JTP" : m.stars !== null ? "Automática" : "Sin embarques este mes"}
            </span>
          </div>
        </div>
        {m.stats ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-4">
            <Stat label="Embarques" value={String(m.stats.total)} />
            <Stat label="Puntualidad" value={pct(m.stats.punctualityScore)} />
            <Stat label="Incidencias" value={String(m.stats.withIncident)} />
            <Stat label="No entregados" value={String(m.stats.notDelivered)} />
          </div>
        ) : null}
      </div>

      {m.comment && !editing && (
        <p className="bg-muted/40 mt-3 flex gap-2 rounded-md p-3 text-sm">
          <MessageSquareQuote className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="whitespace-pre-wrap">
            {m.comment}
            {m.ratedByName && <span className="text-muted-foreground block text-xs">— {m.ratedByName}</span>}
          </span>
        </p>
      )}

      {onSave &&
        (editing ? (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <Label>Calificación de JTP para este mes</Label>
              <StarInput value={stars} onChange={setStars} disabled={busy} />
              <p className="text-muted-foreground text-xs">
                Toca la mitad izquierda de una estrella para media. Sin estrellas, se queda la automática
                {m.autoStars !== null ? ` (${m.autoStars.toFixed(1)})` : ""}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`comment-${m.month}`}>Comentario para el proveedor</Label>
              <Textarea id={`comment-${m.month}`} rows={2} value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} />
              <p className="text-muted-foreground text-xs">Lo verá en «Mis evaluaciones».</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => save()} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Guardar evaluación
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
                Cancelar
              </Button>
              {(m.manualStars !== null || m.comment) && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => save(true)} disabled={busy}>
                  Quitar ajuste
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            {m.manualStars !== null || m.comment ? "Editar evaluación" : "Evaluar este mes"}
          </Button>
        ))}
    </li>
  );
}

/** Guarda el ajuste de un mes (admin) y devuelve las evaluaciones al día. */
export async function saveMonthEvaluation(legalName: string, month: string, stars: number | null, comment: string): Promise<CarrierEvaluations | null> {
  const res = await fetch("/api/admin/carriers/evaluations", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ legalName, month, stars, comment }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error((data as { error?: string }).error ?? "No se pudo guardar.");
    return null;
  }
  toast.success("Evaluación guardada.");
  return data as CarrierEvaluations;
}
