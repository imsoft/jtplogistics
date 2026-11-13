"use client";

import * as React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-11" → [2026, 11]; lo que no es mes → null. */
function parseMonth(value: string | null | undefined): [number, number] | null {
  const m = (value ?? "").match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return mo >= 1 && mo <= 12 ? [y, mo] : null;
}

export interface MonthPickerProps {
  id?: string;
  /** "YYYY-MM" o cadena vacía. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
}

/** Mes y año con piezas de shadcn: sustituye a `<input type="month">`. */
export function MonthPicker({ id, value, onChange, disabled, className, emptyLabel = "Elegir mes" }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const parsed = parseMonth(value);
  const [year, setYear] = React.useState(parsed?.[0] ?? new Date().getFullYear());

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        // Al abrir se muestra el año del mes elegido.
        if (o) setYear(parsed?.[0] ?? new Date().getFullYear());
        setOpen(o);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("justify-start gap-2 font-normal tracking-normal", !parsed && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          {parsed ? `${MONTHS_LONG[parsed[1] - 1]} ${parsed[0]}` : emptyLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Año anterior" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">{year}</span>
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Año siguiente" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((label, i) => {
            const active = parsed?.[0] === year && parsed?.[1] === i + 1;
            return (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={active ? "default" : "ghost"}
                onClick={() => {
                  onChange(`${year}-${String(i + 1).padStart(2, "0")}`);
                  setOpen(false);
                }}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
