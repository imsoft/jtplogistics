"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/ui/app-select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { operatorMissing, vehicleMissing, type VehicleKind } from "@/lib/carrier-fleet";
import { SCT_PERMITS, TRAILER_SUBTYPES, VEHICLE_CONFIGS, labelOf } from "@/lib/sat-catalogs";

interface Vehicle {
  id: string;
  kind: VehicleKind;
  label: string | null;
  plates: string;
  year: number | null;
  vehicleConfig: string | null;
  sctPermitType: string | null;
  sctPermitNumber: string | null;
  grossWeightTons: number | null;
  insurer: string | null;
  policyNumber: string | null;
  trailerSubtype: string | null;
  active: boolean;
}

interface Operator {
  id: string;
  name: string;
  rfc: string | null;
  licenseNumber: string | null;
  phone: string | null;
  active: boolean;
}

interface FleetData {
  canEdit: boolean;
  vehicles: Vehicle[];
  operators: Operator[];
  readiness: { ready: boolean; missing: string[] };
}

type Editing =
  | { type: "vehicle"; item: Vehicle | null }
  | { type: "operator"; item: Operator | null }
  | null;

/**
 * Expediente de Carta Porte de un transportista: sus unidades y operadores.
 * El transportista lo ve sin `carrierId` (es el suyo); JTP lo ve pasando el id.
 */
export function FleetManager({ carrierId, compact = false }: { carrierId?: string; compact?: boolean }) {
  const [data, setData] = useState<FleetData | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<{ type: "vehicle" | "operator"; id: string; label: string } | null>(null);
  const query = carrierId ? `?carrierId=${encodeURIComponent(carrierId)}` : "";

  const load = useCallback(() => {
    fetch(`/api/fleet${query}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: FleetData) => setData(d))
      .catch(() => setFailed(true));
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    if (!deleting) return;
    const res = await fetch(`/api/fleet/${deleting.type === "vehicle" ? "vehicles" : "operators"}/${deleting.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar.");
      return;
    }
    toast.success("Eliminado.");
    setDeleting(null);
    load();
  }

  if (failed) {
    return <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">No se pudo abrir el expediente.</p>;
  }
  if (data === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const { canEdit, vehicles, operators, readiness } = data;

  return (
    <div className="min-w-0 space-y-4">
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-4 text-sm",
          readiness.ready
            ? "border-green-500/40 bg-green-500/5"
            : "border-amber-500/40 bg-amber-500/5"
        )}
      >
        {readiness.ready ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
        ) : (
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        )}
        <div>
          <p className="font-medium">
            {readiness.ready ? "Listo para Carta Porte" : "Expediente incompleto"}
          </p>
          <p className="text-muted-foreground">
            {readiness.ready
              ? "Tiene al menos una unidad y un operador con todos los datos que pide el SAT."
              : `Falta ${readiness.missing.join(" y ")}.`}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 sm:flex-row">
          <div>
            <CardTitle className={compact ? "text-muted-foreground text-sm font-semibold tracking-wider uppercase" : "text-base"}>
              Unidades ({vehicles.length})
            </CardTitle>
            {!compact && <CardDescription>Tractocamiones, camiones y remolques con su permiso SCT y su seguro.</CardDescription>}
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditing({ type: "vehicle", item: null })}>
              <Plus className="size-4" />
              Agregar unidad
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay unidades.</p>
          ) : (
            <div className="divide-y">
              {vehicles.map((v) => {
                const missing = vehicleMissing(v);
                return (
                  <div key={v.id} className={cn("flex items-start justify-between gap-3 py-3", !v.active && "opacity-60")}>
                    <div className="min-w-0 space-y-0.5 text-sm">
                      <p className="font-medium">
                        <span className="font-mono">{v.plates}</span>
                        {v.label && <span className="text-muted-foreground"> · {v.label}</span>}
                        <span className="text-muted-foreground"> · {v.kind === "motriz" ? "Motriz" : "Remolque"}</span>
                        {!v.active && <span className="text-muted-foreground"> · Inactiva</span>}
                      </p>
                      {v.kind === "motriz" ? (
                        <>
                          <p className="text-muted-foreground text-xs">
                            {[v.year, labelOf(VEHICLE_CONFIGS, v.vehicleConfig), v.grossWeightTons ? `${v.grossWeightTons} t` : null].filter(Boolean).join(" · ") || "Sin datos de la unidad"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {v.sctPermitType ? `${v.sctPermitType} ${v.sctPermitNumber ?? ""}` : "Sin permiso SCT"}
                            {" · "}
                            {v.insurer ? `${v.insurer} ${v.policyNumber ?? ""}` : "Sin seguro"}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-xs">{labelOf(TRAILER_SUBTYPES, v.trailerSubtype) ?? "Sin subtipo"}</p>
                      )}
                      {missing.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-500">Falta: {missing.join(", ")}</p>}
                    </div>
                    {canEdit && (
                      <RowActions
                        label={v.plates}
                        onEdit={() => setEditing({ type: "vehicle", item: v })}
                        onDelete={() => setDeleting({ type: "vehicle", id: v.id, label: v.plates })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 sm:flex-row">
          <div>
            <CardTitle className={compact ? "text-muted-foreground text-sm font-semibold tracking-wider uppercase" : "text-base"}>
              Operadores ({operators.length})
            </CardTitle>
            {!compact && <CardDescription>Quién maneja: el SAT pide su RFC y su número de licencia.</CardDescription>}
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setEditing({ type: "operator", item: null })}>
              <Plus className="size-4" />
              Agregar operador
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {operators.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay operadores.</p>
          ) : (
            <div className="divide-y">
              {operators.map((o) => {
                const missing = operatorMissing(o);
                return (
                  <div key={o.id} className={cn("flex items-start justify-between gap-3 py-3", !o.active && "opacity-60")}>
                    <div className="min-w-0 space-y-0.5 text-sm">
                      <p className="font-medium">
                        {o.name}
                        {!o.active && <span className="text-muted-foreground"> · Inactivo</span>}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {[o.rfc && `RFC ${o.rfc}`, o.licenseNumber && `Licencia ${o.licenseNumber}`, o.phone].filter(Boolean).join(" · ") || "Sin datos"}
                      </p>
                      {missing.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-500">Falta: {missing.join(", ")}</p>}
                    </div>
                    {canEdit && (
                      <RowActions
                        label={o.name}
                        onEdit={() => setEditing({ type: "operator", item: o })}
                        onDelete={() => setDeleting({ type: "operator", id: o.id, label: o.name })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          {editing?.type === "vehicle" && (
            <VehicleForm
              item={editing.item}
              carrierId={carrierId}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                load();
              }}
            />
          )}
          {editing?.type === "operator" && (
            <OperatorForm
              item={editing.item}
              carrierId={carrierId}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting?.type === "vehicle" ? "Eliminar unidad" : "Eliminar operador"}
        description={`Se eliminará ${deleting?.label ?? ""} del expediente. Si solo dejó de trabajar con ustedes, mejor márcalo como inactivo.`}
        onConfirm={remove}
      />
    </div>
  );
}

function RowActions({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon" className="size-7" onClick={onEdit} aria-label={`Editar ${label}`}>
        <Pencil className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={onDelete} aria-label={`Eliminar ${label}`}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

async function save(path: string, id: string | undefined, body: Record<string, unknown>) {
  const res = await fetch(id ? `${path}/${id}` : path, {
    method: id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "No se pudo guardar.");
  }
}

function Field({ id, label, help, className, children }: { id?: string; label: string; help?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help && <p className="text-muted-foreground text-xs">{help}</p>}
    </div>
  );
}

function VehicleForm({ item, carrierId, onClose, onSaved }: { item: Vehicle | null; carrierId?: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    kind: item?.kind ?? ("motriz" as VehicleKind),
    label: item?.label ?? "",
    plates: item?.plates ?? "",
    year: item?.year ? String(item.year) : "",
    vehicleConfig: item?.vehicleConfig ?? "",
    sctPermitType: item?.sctPermitType ?? "TPAF01",
    sctPermitNumber: item?.sctPermitNumber ?? "",
    grossWeightTons: item?.grossWeightTons ? String(item.grossWeightTons) : "",
    insurer: item?.insurer ?? "",
    policyNumber: item?.policyNumber ?? "",
    trailerSubtype: item?.trailerSubtype ?? "",
    active: item?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement | null>(null);
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const motriz = f.kind === "motriz";

  async function submit() {
    setBusy(true);
    try {
      await save("/api/fleet/vehicles", item?.id, { ...f, carrierId });
      toast.success(item ? "Unidad actualizada." : "Unidad agregada.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item ? `Editar ${item.plates}` : "Agregar unidad"}</DialogTitle>
        <DialogDescription>Los datos tal como vienen en la tarjeta de circulación, el permiso SCT y la póliza.</DialogDescription>
      </DialogHeader>
      <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-1 sm:grid-cols-2" ref={container}>
        <Field label="Tipo" className="sm:col-span-2">
          <AppSelect
            value={f.kind}
            onValueChange={(v) => set("kind")(v === "remolque" ? "remolque" : "motriz")}
            options={[
              { value: "motriz", label: "Motriz (tractocamión o camión)" },
              { value: "remolque", label: "Remolque o semirremolque" },
            ]}
            container={container}
            className="w-full"
          />
        </Field>
        <Field id="fv-plates" label="Placas" help="Sin guiones ni espacios.">
          <Input id="fv-plates" value={f.plates} maxLength={12} onChange={(e) => set("plates")(e.target.value)} />
        </Field>
        <Field id="fv-label" label="Número económico" help="Opcional, como la identifican ustedes.">
          <Input id="fv-label" value={f.label} onChange={(e) => set("label")(e.target.value)} />
        </Field>
        {motriz ? (
          <>
            <Field id="fv-year" label="Año del modelo">
              <Input id="fv-year" inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => set("year")(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field id="fv-weight" label="Peso bruto vehicular (toneladas)">
              <Input id="fv-weight" inputMode="decimal" value={f.grossWeightTons} onChange={(e) => set("grossWeightTons")(e.target.value.replace(/[^\d.]/g, ""))} />
            </Field>
            <Field label="Configuración vehicular" className="sm:col-span-2">
              <AppSelect value={f.vehicleConfig} onValueChange={set("vehicleConfig")} options={VEHICLE_CONFIGS} container={container} className="w-full" />
            </Field>
            <Field label="Tipo de permiso SCT" className="sm:col-span-2">
              <AppSelect value={f.sctPermitType} onValueChange={set("sctPermitType")} options={SCT_PERMITS} container={container} className="w-full" />
            </Field>
            <Field id="fv-permit" label="Número de permiso SCT" className="sm:col-span-2">
              <Input id="fv-permit" value={f.sctPermitNumber} onChange={(e) => set("sctPermitNumber")(e.target.value)} />
            </Field>
            <Field id="fv-insurer" label="Aseguradora (responsabilidad civil)">
              <Input id="fv-insurer" value={f.insurer} onChange={(e) => set("insurer")(e.target.value)} />
            </Field>
            <Field id="fv-policy" label="Número de póliza">
              <Input id="fv-policy" value={f.policyNumber} onChange={(e) => set("policyNumber")(e.target.value)} />
            </Field>
          </>
        ) : (
          <Field label="Subtipo de remolque" className="sm:col-span-2">
            <AppSelect value={f.trailerSubtype} onValueChange={set("trailerSubtype")} options={TRAILER_SUBTYPES} container={container} className="w-full" />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Switch checked={f.active} onCheckedChange={set("active")} />
          Activa (se puede usar en embarques)
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy || !f.plates.trim()}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}

function OperatorForm({ item, carrierId, onClose, onSaved }: { item: Operator | null; carrierId?: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: item?.name ?? "",
    rfc: item?.rfc ?? "",
    licenseNumber: item?.licenseNumber ?? "",
    phone: item?.phone ?? "",
    active: item?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setBusy(true);
    try {
      await save("/api/fleet/operators", item?.id, { ...f, carrierId });
      toast.success(item ? "Operador actualizado." : "Operador agregado.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item ? `Editar ${item.name}` : "Agregar operador"}</DialogTitle>
        <DialogDescription>El SAT pide el RFC y el número de licencia federal de quien maneja.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fo-name" label="Nombre completo" className="sm:col-span-2">
          <Input id="fo-name" value={f.name} onChange={(e) => set("name")(e.target.value)} />
        </Field>
        <Field id="fo-rfc" label="RFC" help="13 caracteres.">
          <Input id="fo-rfc" maxLength={13} value={f.rfc} onChange={(e) => set("rfc")(e.target.value)} />
        </Field>
        <Field id="fo-license" label="Número de licencia federal">
          <Input id="fo-license" value={f.licenseNumber} onChange={(e) => set("licenseNumber")(e.target.value)} />
        </Field>
        <Field id="fo-phone" label="Teléfono">
          <Input id="fo-phone" inputMode="tel" value={f.phone} onChange={(e) => set("phone")(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Switch checked={f.active} onCheckedChange={set("active")} />
          Activo
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy || f.name.trim().length < 3}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}
