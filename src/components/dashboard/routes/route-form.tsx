"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { AppSelect } from "@/components/ui/app-select";
import { CityCombobox } from "./city-combobox";
import { COUNTRIES, HOME_COUNTRY, isInternationalRoute } from "@/lib/countries";
import { parseCityValue, findCityValue } from "@/lib/data/mexico-cities";
import { ROUTE_STATUS_OPTIONS } from "@/lib/constants/route-status";
import { UNIT_TYPE_FALLBACK } from "@/lib/constants/unit-type";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { Megaphone, MapPin, Plus, Trash2, TriangleAlert, Truck } from "lucide-react";
import type { RouteFormData, RouteStatus, UnitType } from "@/types/route.types";
import { useConfirm, removeItem } from "@/components/ui/confirm-provider";

const defaultFormData: RouteFormData = {
  origin: "",
  destination: "",
  destinationState: "",
  originCountry: HOME_COUNTRY,
  destinationCountry: HOME_COUNTRY,
  description: "",
  target: undefined,
  weeklyVolume: undefined,
  unitType: "caja_seca",
  unitTargets: [{ unitType: "caja_seca", target: undefined }],
  status: "active",
};

interface ExistingRoute {
  origin: string;
  destination: string;
  unitType: string;
}

interface RouteFormProps {
  initialValues?: Partial<RouteFormData>;
  existingRoutes?: ExistingRoute[];
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: RouteFormData) => void;
}

export function RouteForm({
  initialValues = {},
  existingRoutes = [],
  submitLabel,
  cancelHref,
  onSubmit,
}: RouteFormProps) {
  const confirm = useConfirm();
  const [status, setStatus] = useState<RouteStatus>(
    initialValues.status ?? defaultFormData.status
  );
  const [unitTargets, setUnitTargets] = useState<Array<{ unitType: UnitType; targetDisplay: string }>>(
    (initialValues.unitTargets && initialValues.unitTargets.length > 0
      ? initialValues.unitTargets
      : [{ unitType: initialValues.unitType ?? defaultFormData.unitType, target: initialValues.target }]
    ).map((item) => ({
      unitType: item.unitType,
      targetDisplay: item.target != null ? formatMxn(item.target) : "",
    }))
  );
  // Store full "State|City" values so each city is unambiguous
  const [origin, setOrigin] = useState<string | null>(
    initialValues.origin?.trim()
      ? findCityValue(initialValues.origin.trim(), null)
      : null
  );
  const [destination, setDestination] = useState<string | null>(
    initialValues.destination?.trim()
      ? findCityValue(
          initialValues.destination.trim(),
          initialValues.destinationState?.trim() || null
        )
      : null
  );
  const [destinationState, setDestinationState] = useState<string>(
    initialValues.destinationState?.trim() || ""
  );
  // Ruta internacional: cada punta con su país. Fuera de México no hay
  // catálogo de ciudades y la ciudad y el estado se escriben a mano.
  const [international, setInternational] = useState(isInternationalRoute(initialValues));
  const [originCountry, setOriginCountry] = useState(initialValues.originCountry || HOME_COUNTRY);
  const [destinationCountry, setDestinationCountry] = useState(initialValues.destinationCountry || HOME_COUNTRY);
  const [originText, setOriginText] = useState(
    initialValues.originCountry && initialValues.originCountry !== HOME_COUNTRY ? initialValues.origin ?? "" : ""
  );
  const [destinationText, setDestinationText] = useState(
    initialValues.destinationCountry && initialValues.destinationCountry !== HOME_COUNTRY ? initialValues.destination ?? "" : ""
  );
  const originAbroad = international && originCountry !== HOME_COUNTRY;
  const destinationAbroad = international && destinationCountry !== HOME_COUNTRY;
  // Internacional sin ninguna punta fuera de México no tiene sentido.
  const internationalWithoutAbroad = international && !originAbroad && !destinationAbroad;
  const [unitTypeOptions, setUnitTypeOptions] = useState(UNIT_TYPE_FALLBACK);

  useEffect(() => {
    fetch("/api/unit-types")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (Array.isArray(data) && data.length > 0) setUnitTypeOptions(data); })
      .catch(() => {});
  }, []);
  const values = {
    description: initialValues.description ?? defaultFormData.description,
  };

  const originCity = originAbroad ? originText.trim() : parseCityValue(origin).city;
  const destCity = destinationAbroad ? destinationText.trim() : parseCityValue(destination).city;
  const duplicateUnitTypes = unitTargets
    .map((ut) => ut.unitType)
    .filter((value, index, arr) => arr.indexOf(value) !== index);

  const isDuplicate =
    !!originCity &&
    !!destCity &&
    unitTargets.some((ut) =>
      existingRoutes.some(
        (r) =>
          r.origin.toLowerCase() === originCity.toLowerCase() &&
          r.destination.toLowerCase() === destCity.toLowerCase() &&
          r.unitType === ut.unitType
      )
    );

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const { state: destState } = parseCityValue(destination);
    const normalizedUnitTargets = unitTargets.map((item) => ({
      unitType: item.unitType,
      target: parseMxn(item.targetDisplay),
    }));
    const volumeRaw = (formData.get("weeklyVolume") as string)?.trim() ?? "";
    const parsedVolume = volumeRaw ? Math.round(Number(volumeRaw)) : null;
    const data: RouteFormData = {
      origin: originCity,
      destination: destCity,
      destinationState: destinationAbroad ? destinationState.trim() : destState || destinationState.trim(),
      originCountry: international ? originCountry : HOME_COUNTRY,
      destinationCountry: international ? destinationCountry : HOME_COUNTRY,
      description: (formData.get("description") as string)?.trim() ?? "",
      target: normalizedUnitTargets[0]?.target,
      weeklyVolume: parsedVolume != null && !isNaN(parsedVolume) ? parsedVolume : null,
      unitType: normalizedUnitTargets[0]?.unitType ?? "caja_seca",
      unitTargets: normalizedUnitTargets,
      status,
    };
    onSubmit(data);
  }

  function addUnitTargetRow() {
    const first = unitTypeOptions[0]?.value ?? "caja_seca";
    setUnitTargets((prev) => [...prev, { unitType: first, targetDisplay: "" }]);
  }

  async function removeUnitTargetRow(index: number) {
    if (unitTargets[index]?.targetDisplay.trim() && !(await confirm(removeItem("este tipo de unidad y su tarifa")))) return;
    setUnitTargets((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={MapPin} title="Ruta" description="De dónde a dónde. En México las ciudades vienen del catálogo por estado." className="space-y-4">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo de ruta</Label>
            <AppSelect
              value={international ? "internacional" : "nacional"}
              onValueChange={(v) => {
                const intl = v === "internacional";
                setInternational(intl);
                // Lo común es que el destino sea el extranjero.
                if (intl && originCountry === HOME_COUNTRY && destinationCountry === HOME_COUNTRY) {
                  setDestinationCountry("US");
                  setDestinationState("");
                }
                if (!intl) setDestinationState(parseCityValue(destination).state);
              }}
              options={[
                { value: "nacional", label: "Nacional" },
                { value: "internacional", label: "Internacional" },
              ]}
              className="w-full"
            />
            <p className="text-muted-foreground text-xs">Las internacionales salen en el Cotizador internacional.</p>
          </div>
          {international && (
            <>
              <div className="space-y-2">
                <Label>País de origen</Label>
                <AppSelect value={originCountry} onValueChange={setOriginCountry} options={[...COUNTRIES]} className="w-full" />
              </div>
              <div className="space-y-2">
                <Label>País de destino</Label>
                <AppSelect
                  value={destinationCountry}
                  onValueChange={(c) => {
                    setDestinationCountry(c);
                    // El estado de México sale del catálogo; el de fuera se escribe.
                    setDestinationState(c === HOME_COUNTRY ? parseCityValue(destination).state : "");
                  }}
                  options={[...COUNTRIES]}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
        {internationalWithoutAbroad && (
          <p className="text-destructive text-sm">En una ruta internacional el origen o el destino tiene que estar fuera de México.</p>
        )}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {originAbroad ? (
          <div className="space-y-2">
            <Label htmlFor="route-origin-text"><RequiredText>Origen</RequiredText></Label>
            <Input id="route-origin-text" value={originText} onChange={(e) => setOriginText(e.target.value)} required className="w-full" />
            <p className="text-muted-foreground text-xs">Ciudad de origen.</p>
          </div>
        ) : (
        <CityCombobox
          id="route-origin"
          label={<RequiredText>Origen</RequiredText>}
          value={origin}
          onValueChange={setOrigin}
          name="origin"
          required
        />
        )}
        {destinationAbroad ? (
          <div className="space-y-2">
            <Label htmlFor="route-destination-text"><RequiredText>Destino</RequiredText></Label>
            <Input id="route-destination-text" value={destinationText} onChange={(e) => setDestinationText(e.target.value)} required className="w-full" />
            <p className="text-muted-foreground text-xs">Ciudad de destino.</p>
          </div>
        ) : (
        <CityCombobox
          id="route-destination"
          label={<RequiredText>Destino</RequiredText>}
          value={destination}
          onValueChange={(v) => {
            setDestination(v);
            setDestinationState(parseCityValue(v).state);
          }}
          name="destination"
          required
        />
        )}
        <div className="space-y-2">
          <Label htmlFor="route-destination-state">{destinationAbroad ? "Estado o provincia del destino" : "Estado del destino"}</Label>
          {destinationAbroad ? (
            <Input
              id="route-destination-state"
              type="text"
              value={destinationState}
              onChange={(e) => setDestinationState(e.target.value)}
              className="w-full"
            />
          ) : (
          <Input
            id="route-destination-state"
            type="text"
            value={destinationState}
            readOnly
            className="w-full bg-muted/50 cursor-default text-muted-foreground"
          />
          )}
        </div>
        </div>
        {isDuplicate && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              La ruta <strong>{originCity} → {destCity}</strong> ya está dada de alta.
            </span>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="route-description">Descripción <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea
            id="route-description"
            name="description"
            defaultValue={values.description}
            rows={3}
            className="resize-none"
          />
        </div>
      </FormSection>

      <FormSection icon={Truck} title="Tipos de unidad y target" description="Una fila por tipo de unidad con su target." className="space-y-3">
        <div className="text-muted-foreground hidden grid-cols-[1fr_1fr_auto] gap-3 text-xs font-semibold uppercase tracking-wide sm:grid">
          <span>Tipo de unidad</span>
          <span>Target ($)</span>
          <span className="w-9" />
        </div>
          <div className="space-y-3">
            {unitTargets.map((row, index) => (
              <div key={`${row.unitType}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_1fr_auto]">
                {/* En celular el tipo ocupa la fila y debajo van el target y el bote. */}
                <div className="col-span-2 sm:col-span-1">
                  <AppSelect
                    value={row.unitType}
                    onValueChange={(v) =>
                      setUnitTargets((prev) => prev.map((item, i) => (i === index ? { ...item, unitType: v as UnitType } : item)))
                    }
                    options={unitTypeOptions}
                    className="w-full"
                  />
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={`Target ${index + 1}`}
                  value={row.targetDisplay}
                  onChange={(e) =>
                    setUnitTargets((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, targetDisplay: formatMxnLive(e.target.value) } : item))
                    )
                  }
                  onBlur={() =>
                    setUnitTargets((prev) =>
                      prev.map((item, i) => {
                        if (i !== index) return item;
                        const parsed = parseMxn(item.targetDisplay);
                        return { ...item, targetDisplay: parsed != null ? formatMxn(parsed) : "" };
                      })
                    )
                  }
                  className="w-full"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar tipo de unidad ${index + 1}`}
                  onClick={() => removeUnitTargetRow(index)}
                  disabled={unitTargets.length <= 1}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
            ))}
          </div>
          {duplicateUnitTypes.length > 0 && (
            <p className="text-sm text-destructive">
              No repitas tipos de unidad en la misma ruta.
            </p>
          )}
        <Button type="button" variant="outline" size="sm" onClick={addUnitTargetRow}>
          <Plus className="size-4" />
          Agregar tipo de unidad
        </Button>
      </FormSection>

      <FormSection icon={Megaphone} title="Volumen y estado" description="Lo que ven los transportistas de esta ruta." className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="route-weekly-volume">
            Volumen mensual <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="route-weekly-volume"
            name="weeklyVolume"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={initialValues.weeklyVolume ?? ""}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Visible para los transportistas cuando la ruta está activa.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <AppSelect
            value={status}
            onValueChange={(v) => setStatus(v as RouteStatus)}
            options={ROUTE_STATUS_OPTIONS}
            className="w-full"
          />
        </div>
      </FormSection>

      <FormActions
        sticky
        submitLabel={submitLabel}
        cancelHref={cancelHref}
        submitDisabled={isDuplicate || duplicateUnitTypes.length > 0 || internationalWithoutAbroad}
      />
    </form>
  );
}
