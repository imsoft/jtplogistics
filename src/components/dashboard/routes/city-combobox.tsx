"use client";

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { MEXICO_STATES_CITIES } from "@/lib/data/mexico-cities";

interface CityComboboxProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Grouped items where each city is stored as "State|City".
 * This matches the ComboboxItem values so Base UI can resolve labels correctly.
 */
const GROUPED_CITY_VALUES = MEXICO_STATES_CITIES.map((group) => ({
  value: group.value,
  items: group.items.map((city) => `${group.value}|${city}`),
}));

/** Converts "State|City" → "City" for display in the input. */
function cityLabel(v: string): string {
  const idx = v.indexOf("|");
  return idx === -1 ? v : v.slice(idx + 1);
}

export function CityCombobox({
  id,
  label,
  placeholder = "",
  value,
  onValueChange,
  name,
  required,
  disabled,
}: CityComboboxProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        items={GROUPED_CITY_VALUES}
        itemToStringLabel={cityLabel}
        value={value}
        onValueChange={(v) => onValueChange(v ?? null)}
        name={name}
        required={required}
        disabled={disabled}
        autoHighlight
      >
        <ComboboxInput
          id={id}
          className="w-full"
          showClear
        />
        <ComboboxContent>
          <div className="max-h-[min(24rem,var(--available-height))] overflow-y-auto p-1">
            <ComboboxEmpty>No se encontraron ciudades.</ComboboxEmpty>
            <ComboboxList className="max-h-none overflow-visible">
              <ComboboxCollection>
                {(group: { value: string; items: string[] }) => (
                  <ComboboxGroup key={group.value} items={group.items}>
                    <ComboboxLabel>{group.value}</ComboboxLabel>
                    {group.items.map((cityValue: string) => (
                      <ComboboxItem key={cityValue} value={cityValue}>
                        {cityLabel(cityValue)}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                )}
              </ComboboxCollection>
            </ComboboxList>
          </div>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
