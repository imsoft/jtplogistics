"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnitTypes } from "@/hooks/use-unit-types";

/**
 * Varios tipos de unidad del catálogo (Tipos de unidades): cada uno es una
 * pastilla que se marca o desmarca con un clic.
 */
export function UnitTypePicker({
  value,
  onChange,
  labelledBy,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  labelledBy?: string;
}) {
  const unitTypes = useUnitTypes();
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  // Uno guardado que ya no está en el catálogo se sigue viendo para poder quitarlo.
  const options = [
    ...unitTypes,
    ...value.filter((v) => !unitTypes.some((u) => u.value === v)).map((v) => ({ value: v, label: v.replace(/_/g, " ") })),
  ];
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {options.map((u) => {
        const on = value.includes(u.value);
        return (
          <button
            key={u.value}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(u.value)}
            className={cn(
              "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
              on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {on && <Check className="size-3.5" aria-hidden />}
            {u.label}
          </button>
        );
      })}
    </div>
  );
}

/** "caja_seca,full" → "Caja seca, Full" con los nombres del catálogo. */
export function useUnitTypeNames() {
  const unitTypes = useUnitTypes();
  return (values: string[]) => values.map((v) => unitTypes.find((u) => u.value === v)?.label ?? v.replace(/_/g, " ")).join(", ");
}
