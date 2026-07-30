"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Selector de fecha basado en el Calendar de shadcn. Sustituye a
 * `<Input type="date">` conservando la misma API: el valor entra y sale como
 * "YYYY-MM-DD", que es el formato que ya manejan la BD y los endpoints.
 *
 * Las fechas se construyen y se leen en hora LOCAL (nada de toISOString), para
 * que elegir el 14 no termine guardando el 13 en México.
 */

/** "2026-08-14" -> Date local a medianoche. Devuelve undefined si no es válida. */
export function parseDateValue(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Date -> "YYYY-MM-DD" usando los componentes locales. */
export function formatDateValue(date: Date | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export interface DatePickerProps {
  id?: string;
  /** Fecha en formato "YYYY-MM-DD" o cadena vacía. */
  value: string;
  onChange: (value: string) => void;
  /** Fecha mínima seleccionable, en "YYYY-MM-DD". */
  min?: string;
  /** Fecha máxima seleccionable, en "YYYY-MM-DD". */
  max?: string;
  disabled?: boolean;
  /** Activa la validación nativa del formulario. */
  required?: boolean;
  /** Nombre para la validación nativa y el reporte de errores. */
  name?: string;
  className?: string;
  /** Texto del botón cuando no hay fecha elegida. */
  emptyLabel?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  disabled,
  required,
  name,
  className,
  emptyLabel = "Elegir fecha",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = parseDateValue(value);
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);

  // Rango del selector de año: cubre fechas de nacimiento y planeación futura.
  const currentYear = new Date().getFullYear();
  const startMonth = minDate ?? new Date(currentYear - 100, 0);
  const endMonth = maxDate ?? new Date(currentYear + 10, 11);

  function handleSelect(date: Date | undefined) {
    onChange(formatDateValue(date));
    setOpen(false);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start gap-2 font-normal normal-case tracking-normal",
              !selected && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="size-4 shrink-0 opacity-60" />
            {selected ? formatLabel(selected) : emptyLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            locale={es}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {/* Espejo accesible del valor para que `required` siga funcionando con la
          validación nativa del formulario. `sr-only` sí es enfocable, a
          diferencia de display:none, así que el navegador puede reportar. */}
      {required && (
        <input
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={value}
          required
          onChange={() => {}}
          onFocus={() => setOpen(true)}
        />
      )}
    </>
  );
}
