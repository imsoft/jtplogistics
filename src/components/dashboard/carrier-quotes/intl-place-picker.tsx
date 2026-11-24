"use client";

import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { MEXICO_STATES_CITIES, type StateCitiesGroup } from "@/lib/data/mexico-cities";
import { US_STATES_CITIES } from "@/lib/data/us-cities";

/** Lugar del cotizador internacional: país, estado y ciudad. */
export interface IntlPlace {
  country: "MX" | "US";
  state: string;
  city: string;
}

const CATALOG: Record<IntlPlace["country"], StateCitiesGroup[]> = { MX: MEXICO_STATES_CITIES, US: US_STATES_CITIES };
const COUNTRY_OPTIONS = [
  { value: "MX", label: "México" },
  { value: "US", label: "Estados Unidos" },
];

/**
 * País → estado → ciudad, como el cotizador nacional: al elegir el estado la
 * lista de ciudades se filtra a las de ese estado.
 */
export function IntlPlacePicker({ label, value, onChange }: { label: string; value: IntlPlace; onChange: (next: IntlPlace) => void }) {
  const groups = CATALOG[value.country];
  const cities = groups.find((g) => g.value === value.state)?.items ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>País ({label.toLowerCase()})</Label>
        <AppSelect
          value={value.country}
          onValueChange={(c) => onChange({ country: c === "US" ? "US" : "MX", state: "", city: "" })}
          options={COUNTRY_OPTIONS}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label>Estado ({label.toLowerCase()})</Label>
        <AppSelect
          value={value.state}
          onValueChange={(s) => onChange({ ...value, state: s, city: "" })}
          options={groups.map((g) => ({ value: g.value, label: g.value }))}
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <Label>{label}</Label>
        <AppSelect
          value={value.city}
          onValueChange={(c) => onChange({ ...value, city: c })}
          options={cities.map((c) => ({ value: c, label: c }))}
          disabled={!value.state}
          className="w-full"
        />
      </div>
    </div>
  );
}
