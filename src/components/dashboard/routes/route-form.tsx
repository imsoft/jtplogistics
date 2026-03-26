"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CityCombobox } from "./city-combobox";
import { parseCityValue, findCityValue } from "@/lib/data/mexico-cities";
import { ROUTE_STATUS_OPTIONS } from "@/lib/constants/route-status";
import { UNIT_TYPE_FALLBACK } from "@/lib/constants/unit-type";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import type { RouteFormData, RouteStatus, UnitType } from "@/types/route.types";

const defaultFormData: RouteFormData = {
  origin: "",
  destination: "",
  destinationState: "",
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

  const originCity = parseCityValue(origin).city;
  const destCity = parseCityValue(destination).city;
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
    const { city: originCity } = parseCityValue(origin);
    const { city: destCity, state: destState } = parseCityValue(destination);
    const normalizedUnitTargets = unitTargets.map((item) => ({
      unitType: item.unitType,
      target: parseMxn(item.targetDisplay),
    }));
    const data: RouteFormData = {
      origin: originCity,
      destination: destCity,
      destinationState: destState || destinationState.trim(),
      description: (formData.get("description") as string)?.trim() ?? "",
      target: normalizedUnitTargets[0]?.target,
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

  function removeUnitTargetRow(index: number) {
    setUnitTargets((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CityCombobox
              id="route-origin"
              label="Origen"
              value={origin}
              onValueChange={setOrigin}
              name="origin"
              required
            />
            <CityCombobox
              id="route-destination"
              label="Destino"
              value={destination}
              onValueChange={(v) => {
                setDestination(v);
                setDestinationState(parseCityValue(v).state);
              }}
              name="destination"
              required
            />
            <div className="space-y-2">
              <Label htmlFor="route-destination-state">Estado del destino</Label>
              <Input
                id="route-destination-state"
                type="text"
                value={destinationState}
                readOnly
                className="w-full bg-muted/50 cursor-default text-muted-foreground"
              />
            </div>
          </div>

          {isDuplicate && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-400/50 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-900/20 dark:text-yellow-400">
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
              placeholder="Notas o detalles adicionales sobre esta ruta…"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Tipos de unidad y target</Label>
              <Button type="button" variant="outline" onClick={addUnitTargetRow}>
                Agregar tipo
              </Button>
            </div>
            <div className="space-y-3">
              {unitTargets.map((row, index) => (
                <div key={`${row.unitType}-${index}`} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Select
                    value={row.unitType}
                    onValueChange={(v) =>
                      setUnitTargets((prev) => prev.map((item, i) => (i === index ? { ...item, unitType: v as UnitType } : item)))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    inputMode="decimal"
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
                    placeholder="Target (MXN)"
                  />
                  <Button type="button" variant="outline" onClick={() => removeUnitTargetRow(index)} disabled={unitTargets.length <= 1}>
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
            {duplicateUnitTypes.length > 0 && (
              <p className="text-sm text-destructive">
                No repitas tipos de unidad en la misma ruta.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as RouteStatus)}>
                <SelectTrigger id="route-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUTE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isDuplicate || duplicateUnitTypes.length > 0}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
