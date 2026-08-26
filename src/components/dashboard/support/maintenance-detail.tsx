"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, ChevronLeft, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { MAINTENANCE_KIND_LABELS, MAINTENANCE_STATUS_LABELS } from "@/lib/support";
import type { MaintenanceItem } from "./maintenance-board";

interface Detail extends MaintenanceItem {
  laptop: (MaintenanceItem["laptop"] & { equipmentCode?: string | null; serialNumber?: string | null; assignedTo?: { name: string } | null }) | null;
  phone: (MaintenanceItem["phone"] & { equipmentCode?: string | null; serialNumber?: string | null; assignedTo?: { name: string } | null }) | null;
}

function isoDay(value: string): string {
  return value.slice(0, 10);
}

export function MaintenanceDetail({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<Detail | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [findings, setFindings] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [photos, setPhotos] = useState<{ url: string; publicId?: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/developer/maintenance/${id}`);
    if (!res.ok) { setIsLoaded(true); return; }
    const data = (await res.json()) as Detail;
    setItem(data);
    setFindings(data.findings ?? "");
    setPerformedAt(isoDay(data.performedAt ?? new Date().toISOString()));
    setPhotos(data.photos ?? []);
    setIsLoaded(true);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/developer/uploads", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({})) as { url?: string; publicId?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo subir la foto");
      setPhotos((prev) => [...prev, { url: data.url!, publicId: data.publicId }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(status?: "done" | "cancelled" | "scheduled") {
    setError(null);
    setSaved(false);
    if (status === "done" && !findings.trim()) {
      setError("Antes de cerrarlo, anota qué se encontró y qué se hizo: es la evidencia de la auditoría.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/developer/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(status ? { status } : {}),
          findings: findings || null,
          photos,
          ...(status === "done" ? { performedAt } : {}),
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) { setError(data.error ?? "No se pudo guardar."); return; }
      setSaved(true);
      load();
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    await fetch(`/api/developer/maintenance/${id}`, { method: "DELETE" });
    router.push("/developer/dashboard/maintenance");
    router.refresh();
  }

  if (!isLoaded) return <DataTableSkeleton />;
  if (!item) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-destructive">
        No se encontró el mantenimiento.
      </p>
    );
  }

  const equipo = item.laptop ?? item.phone;
  const cerrado = item.status === "done";

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/developer/dashboard/maintenance" aria-label="Volver a mantenimientos">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="page-heading truncate">{equipo?.name ?? "Equipo dado de baja"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{MAINTENANCE_KIND_LABELS[item.kind]}</Badge>
            <Badge className="text-[10px]">{MAINTENANCE_STATUS_LABELS[item.status]}</Badge>
          </div>
        </div>
        <DeleteConfirmDialog
          title="Eliminar mantenimiento"
          description="Se borrará el registro y su evidencia. No se puede deshacer."
          onConfirm={remove}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Datos del mantenimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Responsable" value={item.technician.name} />
            <Row label="Programado" value={new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(new Date(item.scheduledFor))} />
            {item.performedAt && (
              <Row label="Realizado" value={new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(new Date(item.performedAt))} />
            )}
            {equipo?.equipmentCode && <Row label="Código" value={equipo.equipmentCode} />}
            {equipo?.serialNumber && <Row label="Serie" value={equipo.serialNumber} />}
            {equipo?.assignedTo?.name && <Row label="Asignado a" value={equipo.assignedTo.name} />}
            {item.ticket && (
              <Row label="Reporte" value={item.ticket.title} />
            )}
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Qué se hace</p>
              <p className="mt-1">{item.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Evidencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="findings">Qué se encontró y qué se hizo</Label>
              <Textarea id="findings" rows={5} value={findings} onChange={(e) => setFindings(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Es lo que lee el auditor: estado del equipo, piezas cambiadas,
                limpieza, actualizaciones, respaldo.
              </p>
            </div>

            {!cerrado && (
              <div className="space-y-2">
                <Label htmlFor="performed">Fecha en que se hizo</Label>
                <DatePicker id="performed" value={performedAt} onChange={setPerformedAt} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Fotos</Label>
              <div className="flex flex-wrap gap-3">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative size-24 overflow-hidden rounded-lg border">
                    <Image src={p.url} alt={`Evidencia ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((x) => x.url !== p.url))}
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive"
                      aria-label="Quitar foto"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                  className="flex size-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition hover:bg-muted/50"
                >
                  {isUploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
                  <span className="text-[10px]">Agregar</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            {saved && <p className="text-sm font-medium text-green-600">Guardado.</p>}

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => save()} disabled={isSaving}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar
              </Button>
              {!cerrado && (
                <Button onClick={() => save("done")} disabled={isSaving}>
                  <CheckCircle2 className="size-4" />
                  Marcar como realizado
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
