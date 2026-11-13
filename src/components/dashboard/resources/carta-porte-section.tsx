"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileStack, Loader2, Plus, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatesInput } from "@/components/ui/phone-plates-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppSelect } from "@/components/ui/app-select";
import { FormSection } from "@/components/ui/form-section";
import { COUNTRIES, SCT_PERMITS, TRAILER_SUBTYPES, VEHICLE_CONFIGS } from "@/lib/sat-catalogs";
import {
  cartaPorteMissing,
  cartaPorteTotals,
  emptyGood,
  locationId,
  type CartaPorte,
  type CartaPorteGood,
  type CartaPorteLocation,
  type CartaPorteTransport,
} from "@/lib/carta-porte";

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  help,
  type = "text",
  inputMode,
  className,
  plates,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  help?: string;
  type?: string;
  inputMode?: "decimal" | "numeric";
  className?: string;
  /** Placas: los guiones se ponen solos. */
  plates?: boolean;
}) {
  const InputTag = plates ? PlatesInput : Input;
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <InputTag id={id} type={type} inputMode={inputMode} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {help && <p className="text-muted-foreground text-[11px]">{help}</p>}
    </div>
  );
}

function SubTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
      <p className="text-xs font-bold tracking-wide uppercase">{children}</p>
      {aside}
    </div>
  );
}

function LocationFields({
  kind,
  value,
  onChange,
  disabled,
}: {
  kind: "origin" | "destination";
  value: CartaPorteLocation;
  onChange: (v: CartaPorteLocation) => void;
  disabled: boolean;
}) {
  const set = (k: keyof CartaPorteLocation) => (v: string) => onChange({ ...value, [k]: v });
  const p = `cp-${kind}`;
  return (
    <div className="space-y-3">
      <SubTitle aside={<span className="text-muted-foreground text-xs">ID {locationId(kind)}</span>}>
        {kind === "origin" ? "Origen (remitente)" : "Destino (destinatario)"}
      </SubTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field id={`${p}-rfc`} label="RFC" value={value.rfc} onChange={set("rfc")} disabled={disabled} />
        <Field id={`${p}-name`} label="Nombre o razón social" value={value.name} onChange={set("name")} disabled={disabled} className="lg:col-span-2" />
        <Field id={`${p}-numreg`} label="NumRegIdTrib" value={value.numRegIdTrib} onChange={set("numRegIdTrib")} disabled={disabled} help="Solo si es extranjero." />
        <Field
          id={`${p}-date`}
          label={kind === "origin" ? "Fecha y hora de salida" : "Fecha y hora de llegada"}
          type="datetime-local"
          value={value.dateTime}
          onChange={set("dateTime")}
          disabled={disabled}
        />
        <Field id={`${p}-street`} label="Calle" value={value.street} onChange={set("street")} disabled={disabled} className="lg:col-span-2" />
        <Field id={`${p}-ext`} label="Núm. exterior" value={value.extNumber} onChange={set("extNumber")} disabled={disabled} />
        <Field id={`${p}-int`} label="Núm. interior" value={value.intNumber} onChange={set("intNumber")} disabled={disabled} />
        <Field id={`${p}-cp`} label="CP" value={value.postalCode} onChange={set("postalCode")} disabled={disabled} inputMode="numeric" />
        <Field id={`${p}-colony`} label="Colonia" value={value.colony} onChange={set("colony")} disabled={disabled} help="Clave y nombre, p. ej. 1380-Guadalupe del Moral." className="lg:col-span-2" />
        <Field id={`${p}-locality`} label="Localidad" value={value.locality} onChange={set("locality")} disabled={disabled} />
        <Field id={`${p}-municipality`} label="Municipio" value={value.municipality} onChange={set("municipality")} disabled={disabled} />
        <Field id={`${p}-state`} label="Estado" value={value.state} onChange={set("state")} disabled={disabled} />
        <div className="space-y-1.5">
          <Label className="text-xs">País</Label>
          {/* Se muestra el nombre; se guarda la clave del SAT (MEX, USA, CAN). */}
          <AppSelect
            value={value.country}
            onValueChange={set("country")}
            options={
              value.country && !COUNTRIES.some((c) => c.value === value.country)
                ? [{ value: value.country, label: value.country }, ...COUNTRIES]
                : COUNTRIES
            }
            disabled={disabled}
            className="w-full"
          />
        </div>
        {kind === "destination" && (
          <Field id={`${p}-km`} label="Distancia recorrida (km)" value={value.distanceKm} onChange={set("distanceKm")} disabled={disabled} inputMode="decimal" />
        )}
      </div>
    </div>
  );
}

function GoodRow({
  i,
  value,
  onChange,
  onRemove,
  disabled,
}: {
  i: number;
  value: CartaPorteGood;
  onChange: (v: CartaPorteGood) => void;
  onRemove: (() => void) | null;
  disabled: boolean;
}) {
  const set = (k: keyof CartaPorteGood) => (v: string) => onChange({ ...value, [k]: v });
  const p = `cp-good-${i}`;
  return (
    <li className="bg-muted/30 rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase">Mercancía {i + 1}</p>
        {onRemove && !disabled && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive h-7" onClick={onRemove}>
            <Trash2 className="size-3.5" />
            Quitar
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-8">
        <Field id={`${p}-key`} label="Bienes transp." value={value.satKey} onChange={set("satKey")} disabled={disabled} help="Clave SAT, p. ej. 24122002." className="col-span-2 lg:col-span-1" />
        <Field id={`${p}-desc`} label="Descripción" value={value.description} onChange={set("description")} disabled={disabled} className="col-span-2 lg:col-span-2" />
        <Field id={`${p}-qty`} label="Cantidad" value={value.quantity} onChange={set("quantity")} disabled={disabled} inputMode="decimal" />
        <Field id={`${p}-unit`} label="Clave unidad" value={value.unitKey} onChange={set("unitKey")} disabled={disabled} help="P. ej. H87 (pieza)." />
        <Field id={`${p}-kg`} label="Peso (kg)" value={value.weightKg} onChange={set("weightKg")} disabled={disabled} inputMode="decimal" />
        <Field id={`${p}-tare`} label="Peso tara (kg)" value={value.tareKg} onChange={set("tareKg")} disabled={disabled} inputMode="decimal" />
        <Field id={`${p}-net`} label="Peso neto (kg)" value={value.netKg} onChange={set("netKg")} disabled={disabled} inputMode="decimal" />
      </div>
    </li>
  );
}

interface FleetVehicle {
  kind: "motriz" | "remolque";
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

const norm = (s: string | null | undefined) => (s ?? "").toUpperCase().replace(/[\s-]+/g, "");

/** El vehículo de la flota que corresponde a lo escrito en Tracto o Caja (por placa o número económico). */
function pickVehicle(list: FleetVehicle[], kind: FleetVehicle["kind"], typed: string): FleetVehicle | undefined {
  const mine = list.filter((v) => v.kind === kind && v.active);
  const t = norm(typed);
  return (t && mine.find((v) => norm(v.plates) === t || norm(v.label) === t)) || (mine.length === 1 ? mine[0] : undefined);
}

/**
 * Apartado "Carta porte" del embarque: ubicaciones, mercancías (varias) y
 * autotransporte. Lo que se captura aquí sale en el PDF de la carta porte.
 */
export function CartaPorteSection({
  value,
  onChange,
  disabled,
  carrierId,
  truck,
  trailer,
}: {
  value: CartaPorte;
  onChange: (v: CartaPorte) => void;
  disabled: boolean;
  /** Transportista elegido: para tomar los datos de su flota. */
  carrierId?: string;
  truck: string;
  trailer: string;
}) {
  const [loadingFleet, setLoadingFleet] = useState(false);
  const setTransport = (k: keyof CartaPorteTransport) => (v: string) => onChange({ ...value, transport: { ...value.transport, [k]: v } });
  const t = value.transport;
  const totals = cartaPorteTotals(value);
  const missing = cartaPorteMissing(value);

  async function fromFleet() {
    if (!carrierId) return;
    setLoadingFleet(true);
    try {
      const res = await fetch(`/api/fleet?carrierId=${encodeURIComponent(carrierId)}`);
      const d = (await res.json().catch(() => ({}))) as { vehicles?: FleetVehicle[]; error?: string };
      if (!res.ok) throw new Error(d.error ?? "No se pudo leer la flota.");
      const vehicles = d.vehicles ?? [];
      const tractor = pickVehicle(vehicles, "motriz", truck);
      const box = pickVehicle(vehicles, "remolque", trailer);
      if (!tractor && !box) {
        toast.error("No encontramos la unidad en la flota del transportista. Revisa el tracto y la caja, o captúralo a mano.");
        return;
      }
      // Solo llena lo que la flota sí tiene; lo demás se queda como estaba.
      const keep = (cur: string, next: string | number | null | undefined) => (next !== null && next !== undefined && String(next) ? String(next) : cur);
      onChange({
        ...value,
        transport: {
          ...t,
          ...(tractor && {
            permitType: keep(t.permitType, tractor.sctPermitType),
            permitNumber: keep(t.permitNumber, tractor.sctPermitNumber),
            vehicleConfig: keep(t.vehicleConfig, tractor.vehicleConfig),
            plates: keep(t.plates, tractor.plates),
            modelYear: keep(t.modelYear, tractor.year),
            grossVehicleWeight: keep(t.grossVehicleWeight, tractor.grossWeightTons),
            civilInsurer: keep(t.civilInsurer, tractor.insurer),
            civilPolicy: keep(t.civilPolicy, tractor.policyNumber),
          }),
          ...(box && {
            trailerSubtype: keep(t.trailerSubtype, box.trailerSubtype),
            trailerPlates: keep(t.trailerPlates, box.plates),
          }),
        },
      });
      toast.success(tractor && box ? "Se tomaron el tracto y la caja de la flota." : tractor ? "Se tomó el tracto de la flota." : "Se tomó la caja de la flota.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo leer la flota.");
    } finally {
      setLoadingFleet(false);
    }
  }

  const options = (list: { value: string; label: string }[], current: string) =>
    current && !list.some((o) => o.value === current) ? [{ value: current, label: current }, ...list] : list;

  return (
    <FormSection icon={FileStack} title="Carta porte" description="Ubicaciones, mercancías y autotransporte. Sale en el PDF de la carta porte.">
      <div className="space-y-6">
        <LocationFields kind="origin" value={value.origin} onChange={(origin) => onChange({ ...value, origin })} disabled={disabled} />
        <LocationFields kind="destination" value={value.destination} onChange={(destination) => onChange({ ...value, destination })} disabled={disabled} />

        <div className="space-y-3">
          <SubTitle
            aside={
              !disabled && (
                <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, goods: [...value.goods, emptyGood()] })}>
                  <Plus className="size-4" />
                  Agregar mercancía
                </Button>
              )
            }
          >
            Mercancías
          </SubTitle>
          <ol className="space-y-3">
            {value.goods.map((g, i) => (
              <GoodRow
                key={i}
                i={i}
                value={g}
                disabled={disabled}
                onChange={(next) => onChange({ ...value, goods: value.goods.map((x, j) => (j === i ? next : x)) })}
                onRemove={value.goods.length > 1 ? () => onChange({ ...value, goods: value.goods.filter((_, j) => j !== i) }) : null}
              />
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span>
              <span className="text-muted-foreground">Peso bruto total: </span>
              <span className="font-semibold tabular-nums">{totals.grossWeightKg.toLocaleString("es-MX", { minimumFractionDigits: 3 })} KGM</span>
            </span>
            <span>
              <span className="text-muted-foreground">Total de mercancías: </span>
              <span className="font-semibold tabular-nums">{totals.count}</span>
            </span>
            <label className="flex items-center gap-2">
              <Switch
                checked={value.inverseLogistics}
                disabled={disabled}
                onCheckedChange={(inverseLogistics) => onChange({ ...value, inverseLogistics })}
                aria-label="Logística inversa"
              />
              <span>Logística inversa (recolección o devolución)</span>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <SubTitle
            aside={
              !disabled && (
                <Button type="button" variant="outline" size="sm" onClick={fromFleet} disabled={!carrierId || loadingFleet}>
                  {loadingFleet ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                  Tomar de la flota del transportista
                </Button>
              )
            }
          >
            Autotransporte
          </SubTitle>
          {!carrierId && !disabled && <p className="text-muted-foreground text-xs">Elige el transportista para tomar los datos de su flota.</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de permiso SCT</Label>
              <AppSelect value={t.permitType} onValueChange={setTransport("permitType")} options={options(SCT_PERMITS, t.permitType)} disabled={disabled} className="w-full" />
            </div>
            <Field id="cp-permit-number" label="Folio del permiso SCT" value={t.permitNumber} onChange={setTransport("permitNumber")} disabled={disabled} />
            <div className="space-y-1.5">
              <Label className="text-xs">Configuración vehicular</Label>
              <AppSelect value={t.vehicleConfig} onValueChange={setTransport("vehicleConfig")} options={options(VEHICLE_CONFIGS, t.vehicleConfig)} disabled={disabled} className="w-full" />
            </div>
            <Field id="cp-plates" label="Placa de la unidad" plates value={t.plates} onChange={setTransport("plates")} disabled={disabled} />
            <Field id="cp-model" label="Modelo (año)" value={t.modelYear} onChange={setTransport("modelYear")} disabled={disabled} inputMode="numeric" />
            <Field id="cp-gross" label="Peso bruto vehicular (t)" value={t.grossVehicleWeight} onChange={setTransport("grossVehicleWeight")} disabled={disabled} inputMode="decimal" />
            <Field id="cp-civil-insurer" label="Aseguradora resp. civil" value={t.civilInsurer} onChange={setTransport("civilInsurer")} disabled={disabled} />
            <Field id="cp-civil-policy" label="Póliza resp. civil" value={t.civilPolicy} onChange={setTransport("civilPolicy")} disabled={disabled} />
            <Field id="cp-cargo-insurer" label="Aseguradora de carga" value={t.cargoInsurer} onChange={setTransport("cargoInsurer")} disabled={disabled} />
            <Field id="cp-cargo-policy" label="Póliza de carga" value={t.cargoPolicy} onChange={setTransport("cargoPolicy")} disabled={disabled} />
            <Field id="cp-cargo-premium" label="Prima del seguro de carga ($)" value={t.cargoPremium} onChange={setTransport("cargoPremium")} disabled={disabled} inputMode="decimal" />
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de remolque</Label>
              <AppSelect value={t.trailerSubtype} onValueChange={setTransport("trailerSubtype")} options={options(TRAILER_SUBTYPES, t.trailerSubtype)} disabled={disabled} className="w-full" />
            </div>
            <Field id="cp-trailer-plates" label="Placa del remolque" plates value={t.trailerPlates} onChange={setTransport("trailerPlates")} disabled={disabled} />
          </div>
        </div>

        {missing.length > 0 && !disabled && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p className="font-medium">Para que la carta porte salga completa falta:</p>
            <ul className="text-muted-foreground mt-1 list-disc pl-5">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-1">Puedes guardar el embarque y completarlo después.</p>
          </div>
        )}
      </div>
    </FormSection>
  );
}
