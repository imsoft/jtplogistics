"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, Plus, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import {
  MAINTENANCE_KIND_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from "@/lib/support";
import { MaintenanceReportButton } from "./maintenance-report-button";

interface EquipmentItem {
  id: string;
  name: string;
  equipmentCode: string | null;
  assignedTo: { name: string } | null;
}

export interface MaintenanceItem {
  id: string;
  kind: keyof typeof MAINTENANCE_KIND_LABELS;
  status: keyof typeof MAINTENANCE_STATUS_LABELS;
  description: string;
  findings: string | null;
  scheduledFor: string;
  performedAt: string | null;
  photos: { url: string }[] | null;
  laptop: { id: string; name: string } | null;
  phone: { id: string; name: string } | null;
  technician: { name: string };
  ticket: { id: string; title: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-muted text-muted-foreground",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(iso));
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MaintenanceBoard({ currentUserName }: { currentUserName: string }) {
  const [items, setItems] = useState<MaintenanceItem[] | null>(null);
  const [equipment, setEquipment] = useState<{ laptops: EquipmentItem[]; phones: EquipmentItem[] } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [kind, setKind] = useState<"preventive" | "corrective">("preventive");
  const [equipmentValue, setEquipmentValue] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledFor, setScheduledFor] = useState(todayIso());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/developer/maintenance")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: MaintenanceItem[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/developer/equipment")
      .then((r) => (r.ok ? r.json() : { laptops: [], phones: [] }))
      .then(setEquipment)
      .catch(() => setEquipment({ laptops: [], phones: [] }));
  }, [load]);

  const equipmentOptions = [
    ...(equipment?.laptops ?? []).map((l) => ({
      value: `laptop:${l.id}`,
      label: `Laptop · ${l.name}${l.assignedTo ? ` — ${l.assignedTo.name}` : ""}`,
    })),
    ...(equipment?.phones ?? []).map((p) => ({
      value: `phone:${p.id}`,
      label: `Celular · ${p.name}${p.assignedTo ? ` — ${p.assignedTo.name}` : ""}`,
    })),
  ];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!equipmentValue) { setError("Elige el equipo."); return; }
    if (!description.trim()) { setError("Describe qué se va a hacer."); return; }

    setIsSaving(true);
    try {
      const [equipmentKind, equipmentId] = equipmentValue.split(":");
      const res = await fetch("/api/developer/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, equipmentKind, equipmentId, description, scheduledFor }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setError(data.error ?? "No se pudo programar."); return; }
      setDescription(""); setEquipmentValue(""); setShowForm(false);
      load();
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsSaving(false);
    }
  }

  const pendientes = items?.filter((m) => m.status === "scheduled") ?? [];
  const historial = items?.filter((m) => m.status !== "scheduled") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Cada mantenimiento deja constancia de quién lo hizo, cuándo se programó,
          cuándo se hizo y con qué evidencia: es lo que revisa la auditoría de ISO 9001.
        </p>
        <div className="flex shrink-0 gap-3">
          <MaintenanceReportButton items={items ?? []} generatedBy={currentUserName} />
          <Button
            onClick={() => {
              setError(null);
              setShowForm(true);
            }}
          >
            <Plus className="size-4" />
            Programar
          </Button>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Programar mantenimiento</DialogTitle>
            <DialogDescription>
              Queda agendado y, al hacerlo, se cierra con la evidencia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="m-kind">Tipo</Label>
                <AppSelect
                  value={kind}
                  onValueChange={(v) => setKind(v as typeof kind)}
                  options={[
                    { value: "preventive", label: "Preventivo" },
                    { value: "corrective", label: "Correctivo" },
                  ]}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {kind === "preventive"
                    ? "Revisión programada para evitar fallas."
                    : "Atención de algo que ya falló."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-date">Fecha</Label>
                <DatePicker id="m-date" value={scheduledFor} onChange={setScheduledFor} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-equipment">Equipo</Label>
              <AppSelect
                value={equipmentValue}
                onValueChange={setEquipmentValue}
                options={equipmentOptions}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Laptops y celulares dados de alta, con su responsable.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-desc">Qué se va a hacer</Label>
              <Textarea id="m-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                {isSaving ? "Guardando…" : "Programar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {!items ? (
        <DataTableSkeleton />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Programados ({pendientes.length})
            </h2>
            {pendientes.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No hay mantenimientos pendientes.
              </p>
            ) : (
              pendientes.map((m) => <MaintenanceRow key={m.id} item={m} />)
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Historial ({historial.length})
            </h2>
            {historial.length === 0 ? (
              <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                Todavía no hay mantenimientos cerrados.
              </p>
            ) : (
              historial.map((m) => <MaintenanceRow key={m.id} item={m} />)
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MaintenanceRow({ item }: { item: MaintenanceItem }) {
  const equipo = item.laptop?.name ?? item.phone?.name ?? "Equipo dado de baja";
  const Icon = item.kind === "preventive" ? ShieldCheck : Wrench;

  return (
    <Link
      href={`/developer/dashboard/maintenance/${item.id}`}
      className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{equipo}</p>
          <Badge variant="secondary" className="text-[10px]">
            {MAINTENANCE_KIND_LABELS[item.kind]}
          </Badge>
          <Badge className={`text-[10px] ${STATUS_STYLES[item.status]}`}>
            {MAINTENANCE_STATUS_LABELS[item.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3" />
            {item.status === "done" && item.performedAt
              ? `Realizado el ${formatDate(item.performedAt)}`
              : `Programado para el ${formatDate(item.scheduledFor)}`}
          </span>
          {item.photos && item.photos.length > 0 && (
            <span>{item.photos.length === 1 ? "1 foto" : `${item.photos.length} fotos`}</span>
          )}
          {item.ticket && <span>Desde un reporte</span>}
        </div>
      </div>
    </Link>
  );
}
