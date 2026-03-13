"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { UNIT_TYPE_OPTIONS } from "@/lib/constants/unit-type";
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
  unitType: "dry_box",
  status: "active",
};

interface ExistingRoute {
  origin: string;
  destination: string;
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
  const [unitType, setUnitType] = useState<UnitType>(
    initialValues.unitType ?? defaultFormData.unitType
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
  const [targetDisplay, setTargetDisplay] = useState<string>(
    initialValues.target != null ? formatMxn(initialValues.target) : ""
  );
  const values = {
    description: initialValues.description ?? defaultFormData.description,
  };

  const originCity = parseCityValue(origin).city;
  const destCity = parseCityValue(destination).city;
  const isDuplicate =
    !!originCity &&
    !!destCity &&
    existingRoutes.some(
      (r) =>
        r.origin.toLowerCase() === originCity.toLowerCase() &&
        r.destination.toLowerCase() === destCity.toLowerCase()
    );

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const parsedTarget = parseMxn(targetDisplay);
    const { city: originCity } = parseCityValue(origin);
    const { city: destCity, state: destState } = parseCityValue(destination);
    const data: RouteFormData = {
      origin: originCity,
      destination: destCity,
      destinationState: destState || destinationState.trim(),
      description: (formData.get("description") as string)?.trim() ?? "",
      target: parsedTarget,
      unitType,
      status,
    };
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="space-y-4">
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
              className="w-full bg-muted/50 cursor-default"
            />
          </div>
        </div>

        {isDuplicate && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-400/50 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-900/20 dark:text-yellow-400">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              La ruta <strong>{originCity} → {destCity}</strong> ya está dada de alta.
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="route-description">Descripción (opcional)</Label>
          <Textarea
            id="route-description"
            name="description"
            defaultValue={values.description}
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="route-target">Target (MXN)</Label>
            <Input
              id="route-target"
              type="text"
              inputMode="decimal"
              value={targetDisplay}
              onChange={(e) => setTargetDisplay(formatMxnLive(e.target.value))}
              onBlur={() => {
                const parsed = parseMxn(targetDisplay);
                if (parsed != null) setTargetDisplay(formatMxn(parsed));
              }}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de unidad</Label>
            <Select value={unitType} onValueChange={(v) => setUnitType(v as UnitType)}>
              <SelectTrigger id="route-unit-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" className="w-full sm:w-auto" disabled={isDuplicate}>
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
