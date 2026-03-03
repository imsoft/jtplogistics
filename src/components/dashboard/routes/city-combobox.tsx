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
import type { StateCitiesGroup } from "@/lib/data/mexico-cities";

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
        items={MEXICO_STATES_CITIES}
        value={value}
        onValueChange={(v) => onValueChange(v ?? null)}
        name={name}
        required={required}
        disabled={disabled}
        autoHighlight
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          className="w-full"
          showClear
        />
        <ComboboxContent>
          <div className="max-h-[min(24rem,var(--available-height))] overflow-y-auto p-1">
            <ComboboxEmpty>No se encontraron ciudades.</ComboboxEmpty>
            <ComboboxList className="max-h-none overflow-visible">
              <ComboboxCollection>
                {(group: StateCitiesGroup) => (
                  <ComboboxGroup key={group.value} items={group.items}>
                    <ComboboxLabel>{group.value}</ComboboxLabel>
                    {group.items.map((city: string) => (
                      <ComboboxItem key={`${group.value}-${city}`} value={`${group.value}|${city}`}>
                        {city}
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
