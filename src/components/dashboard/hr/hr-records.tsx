"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MonthPicker } from "@/components/ui/month-picker";
import { StarInput, StarRating } from "@/components/ui/star-rating";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { removeItem, useConfirm } from "@/components/ui/confirm-provider";
import { actaFilename, type ActaData } from "@/lib/acta-administrativa";

export interface SavedActa {
  id: string;
  employeeName: string;
  data: ActaData;
  createdAt: string;
  createdByName: string | null;
}

interface Evaluation {
  id: string;
  period: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  evaluatedByName: string | null;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const periodLabel = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return `${MONTHS[m - 1] ?? ""} ${y}`;
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

/** Arma y descarga el PDF de un acta (nueva o ya guardada). */
export async function downloadActaPdf(data: ActaData) {
  const [{ pdf }, { ActaPdf }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/dashboard/hr/acta-pdf")]);
  const blob = await pdf(<ActaPdf data={data} logoUrl={`${window.location.origin}/images/logo/jtp-logistics.png`} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = actaFilename(data);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Lista de actas guardadas con su botón para volver a descargarlas. */
export function ActasList({ endpoint, title = "Actas administrativas", showEmployee = false, reloadKey = 0 }: { endpoint: string; title?: string; showEmployee?: boolean; reloadKey?: number }) {
  const [rows, setRows] = useState<SavedActa[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch(endpoint)
      .then((r) => {
        if (r.status === 403) setHidden(true);
        return r.ok ? r.json() : [];
      })
      .then((d: SavedActa[]) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [endpoint, reloadKey]);

  if (hidden) return null;

  async function download(a: SavedActa) {
    setBusyId(a.id);
    try {
      await downloadActaPdf(a.data);
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!rows ? (
          <CardListSkeleton cards={2} />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay actas registradas.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {showEmployee ? `${a.employeeName} · ` : ""}Acta del {fmt(`${a.data.date}T12:00:00`)}
                  </p>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {a.data.incidentDescription} · Levantó {a.createdByName ?? "—"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => download(a)} disabled={busyId === a.id}>
                  {busyId === a.id ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
                  PDF
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Evaluaciones del colaborador (RH y dirección). El colaborador no las ve:
 * la API niega su propio expediente y esta tarjeta no aparece en su perfil.
 */
export function EmployeeEvaluations({ employeeId }: { employeeId: string }) {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Evaluation[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({ period: thisMonth, stars: 0, comment: "" });

  const load = useCallback(() => {
    fetch(`/api/hr/employees/${employeeId}/evaluations`)
      .then((r) => {
        if (r.status === 403) setHidden(true);
        return r.ok ? r.json() : [];
      })
      .then((d: Evaluation[]) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [employeeId]);
  useEffect(load, [load]);

  if (hidden) return null;

  async function save() {
    if (form.stars < 1) {
      toast.error("Elige la calificación (de 1 a 5 estrellas).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      toast.success("Evaluación guardada.");
      setForm({ period: thisMonth, stars: 0, comment: "" });
      setAdding(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(ev: Evaluation) {
    if (!(await confirm(removeItem(`la evaluación de ${periodLabel(ev.period)}`, true)))) return;
    const res = await fetch(`/api/hr/evaluations/${ev.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo quitar.");
      return;
    }
    toast.success("Evaluación quitada.");
    load();
  }

  const average = rows && rows.length ? Math.round((rows.reduce((a, r) => a + r.stars, 0) / rows.length) * 2) / 2 : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">Evaluaciones</CardTitle>
          <p className="text-muted-foreground mt-1 text-xs">Solo las ven dirección y RH; el colaborador no.</p>
        </div>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Evaluar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {adding && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-period">Mes evaluado</Label>
                <MonthPicker id="ev-period" value={form.period} onChange={(period) => setForm((f) => ({ ...f, period }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Calificación</Label>
                <StarInput value={form.stars} onChange={(stars) => setForm((f) => ({ ...f, stars }))} disabled={saving} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-comment">Comentarios</Label>
              <Textarea id="ev-comment" rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
              <p className="text-muted-foreground text-xs">Qué hizo bien y en qué debe mejorar.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
                Guardar evaluación
              </Button>
            </div>
          </div>
        )}

        {!rows ? (
          <CardListSkeleton cards={2} />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Todavía no tiene evaluaciones.</p>
        ) : (
          <>
            {average != null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Promedio:</span>
                <StarRating stars={average} showNumber />
              </div>
            )}
            <ul className="divide-y rounded-lg border text-sm">
              {rows.map((ev) => (
                <li key={ev.id} className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium capitalize">{periodLabel(ev.period)}</span>
                      <StarRating stars={ev.stars} showNumber />
                    </div>
                    {ev.comment && <p className="text-muted-foreground whitespace-pre-wrap text-xs">{ev.comment}</p>}
                    <p className="text-muted-foreground text-[11px]">
                      Evaluó {ev.evaluatedByName ?? "—"} · {fmt(ev.createdAt)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Quitar evaluación" onClick={() => remove(ev)}>
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Lo de RH en el expediente: evaluaciones y actas. */
export function EmployeeHrCards({ employeeId }: { employeeId: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EmployeeEvaluations employeeId={employeeId} />
      <ActasList endpoint={`/api/hr/employees/${employeeId}/actas`} />
    </div>
  );
}

