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
import { getCityState } from "@/lib/data/mexico-cities";
import { ROUTE_STATUS_OPTIONS } from "@/lib/constants/route-status";
import { UNIT_TYPE_OPTIONS } from "@/lib/constants/unit-type";
import { formatMxn, formatMxnLive, parseMxn } from "@/lib/utils";
import type { RouteFormData, RouteStatus, UnitType } from "@/types/route.types";

const defaultFormData: RouteFormData = {
  origin: "",
  destination: "",
  destinationState: "",
  description: "",
  target: undefined,
  unitType: "dry_box",
  status: "pending",
};

interface RouteFormProps {
  initialValues?: Partial<RouteFormData>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: RouteFormData) => void;
}

export function RouteForm({
  initialValues = {},
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
  const [origin, setOrigin] = useState<string | null>(
    initialValues.origin?.trim() ?? null
  );
  const [destination, setDestination] = useState<string | null>(
    initialValues.destination?.trim() ?? null
  );
  const [destinationState, setDestinationState] = useState<string>(
    initialValues.destinationState?.trim() || getCityState(initialValues.destination?.trim() ?? "")
  );
  const [targetDisplay, setTargetDisplay] = useState<string>(
    initialValues.target != null ? formatMxn(initialValues.target) : ""
  );

  const values = {
    description: initialValues.description ?? defaultFormData.description,
  };

  function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const parsedTarget = parseMxn(targetDisplay);
    const data: RouteFormData = {
      origin: origin?.trim() ?? "",
      destination: destination?.trim() ?? "",
      destinationState: destinationState.trim(),
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
            placeholder=""
            value={origin}
            onValueChange={setOrigin}
            name="origin"
            required
          />
          <CityCombobox
            id="route-destination"
            label="Destino"
            placeholder=""
            value={destination}
            onValueChange={(v) => {
              setDestination(v);
              setDestinationState(getCityState(v ?? ""));
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
              placeholder="Se llena automáticamente"
              className="w-full bg-muted/50 cursor-default"
            />
          </div>
        </div>
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
        <Button type="submit" className="w-full sm:w-auto">{submitLabel}</Button>
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
