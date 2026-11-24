"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AppSelect } from "@/components/ui/app-select";
import { RequiredText } from "@/components/ui/form-section";
import { US_STATES_CITIES, usCitiesOf } from "@/lib/data/us-cities";

const STATE_OPTIONS = US_STATES_CITIES.map((g) => ({ value: g.value, label: g.value }));

/**
 * Estado → ciudad de Estados Unidos, como el de México: primero el estado y la
 * lista de ciudades se filtra a las de ese estado. El catálogo trae las
 * principales; si la ciudad no está, se puede escribir a mano.
 */
export function UsStateCityPicker({
  idPrefix,
  label,
  state,
  city,
  onChange,
}: {
  idPrefix: string;
  /** "Origen" o "Destino". */
  label: string;
  state: string;
  city: string;
  onChange: (next: { state: string; city: string }) => void;
}) {
  const cities = usCitiesOf(state);
  // Una ciudad guardada que no está en el catálogo se muestra ya escrita a mano.
  const [manual, setManual] = useState(Boolean(city.trim()) && !cities.some((c) => c.toLowerCase() === city.trim().toLowerCase()));

  return (
    <>
      <div className="space-y-2">
        <Label><RequiredText>Estado ({label.toLowerCase()})</RequiredText></Label>
        <AppSelect
          value={state}
          onValueChange={(s) => onChange({ state: s, city: manual ? city : "" })}
          options={STATE_OPTIONS}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-city`}><RequiredText>{label}</RequiredText></Label>
        {manual ? (
          <Input id={`${idPrefix}-city`} value={city} onChange={(e) => onChange({ state, city: e.target.value })} required className="w-full" />
        ) : (
          <AppSelect
            value={city}
            onValueChange={(c) => onChange({ state, city: c })}
            options={cities.map((c) => ({ value: c, label: c }))}
            disabled={!state}
            className="w-full"
          />
        )}
        <button
          type="button"
          className="text-primary text-xs hover:underline"
          onClick={() => {
            setManual((m) => !m);
            onChange({ state, city: "" });
          }}
        >
          {manual ? "Elegir de la lista" : "¿No está la ciudad? Escríbela"}
        </button>
      </div>
    </>
  );
}
