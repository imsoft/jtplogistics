"use client";

import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateValue, parseDateValue } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

/**
 * Selectores de hora y de fecha con hora hechos con piezas de shadcn (Popover,
 * Calendar, Button), en lugar de los nativos del navegador. Conservan la API
 * de `<input type="time">` ("HH:mm") y `<input type="datetime-local">`
 * ("YYYY-MM-DDTHH:mm"), que es lo que ya guardan la BD y los endpoints.
 */

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/** "18:05" → ["18", "05"]; lo que no es hora → [null, null]. */
function splitTime(value: string | null | undefined): [string | null, string | null] {
  const m = (value ?? "").match(/^(\d{2}):(\d{2})/);
  return m ? [m[1], m[2]] : [null, null];
}

/** Una columna de horas o minutos que se recorre; lleva la elegida a la vista al abrir. */
function Column({ items, selected, onPick, label }: { items: string[]; selected: string | null; onPick: (v: string) => void; label: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("[data-selected=true]");
    el?.scrollIntoView({ block: "center" });
  }, []);
  return (
    <div ref={ref} role="listbox" aria-label={label} className="flex h-60 w-14 flex-col gap-1 overflow-y-auto p-1 [scrollbar-width:thin]">
      {items.map((it) => (
        <Button
          key={it}
          type="button"
          role="option"
          aria-selected={it === selected}
          data-selected={it === selected}
          variant={it === selected ? "default" : "ghost"}
          size="sm"
          className="h-8 w-full shrink-0 tabular-nums"
          onClick={() => onPick(it)}
        >
          {it}
        </Button>
      ))}
    </div>
  );
}

/** Columnas de hora (00–23) y minuto (00–59). */
function TimeColumns({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = splitTime(value);
  return (
    <div className="flex divide-x">
      {[
        { label: "Hora", short: "Hora", items: HOURS, selected: h, pick: (nh: string) => onChange(`${nh}:${m ?? "00"}`) },
        { label: "Minuto", short: "Min", items: MINUTES, selected: m, pick: (nm: string) => onChange(`${h ?? "00"}:${nm}`) },
      ].map((c) => (
        <div key={c.label}>
          <p className="text-muted-foreground border-b py-1.5 text-center text-[10px] font-semibold tracking-wide uppercase">{c.short}</p>
          <Column label={c.label} items={c.items} selected={c.selected} onPick={c.pick} />
        </div>
      ))}
    </div>
  );
}

function Footer({ onClear, onDone }: { onClear?: () => void; onDone: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t p-2">
      {onClear ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Borrar
        </Button>
      ) : (
        <span />
      )}
      <Button type="button" size="sm" onClick={onDone}>
        Listo
      </Button>
    </div>
  );
}

export interface TimePickerProps {
  id?: string;
  /** "HH:mm" (24 horas) o cadena vacía. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  emptyLabel?: string;
}

/** Hora: sustituye a `<input type="time">`. */
export function TimePicker({ id, value, onChange, disabled, className, emptyLabel = "Elegir hora", ...rest }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [h, m] = splitTime(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={rest["aria-label"]}
          className={cn("w-full justify-start gap-2 font-normal tracking-normal tabular-nums", !h && "text-muted-foreground", className)}
        >
          <Clock className="size-4 shrink-0 opacity-60" />
          {h ? `${h}:${m} h` : emptyLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <TimeColumns value={value} onChange={onChange} />
        <Footer onClear={value ? () => { onChange(""); setOpen(false); } : undefined} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function formatDateTimeLabel(date: Date, time: string | null): string {
  const d = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(date);
  return time ? `${d}, ${time} h` : d;
}

export interface DateTimePickerProps {
  id?: string;
  /** "YYYY-MM-DDTHH:mm" o cadena vacía. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
}

/** Fecha y hora en un solo panel: sustituye a `<input type="datetime-local">`. */
export function DateTimePicker({ id, value, onChange, disabled, className, emptyLabel = "Elegir fecha y hora" }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const datePart = value.slice(0, 10);
  const timePart = value.length >= 16 ? value.slice(11, 16) : "";
  const selected = parseDateValue(datePart);
  const currentYear = new Date().getFullYear();

  const emit = (d: string, t: string) => onChange(d ? `${d}T${t || "00:00"}` : "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start gap-2 font-normal tracking-normal", !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          <span className="truncate">{selected ? formatDateTimeLabel(selected, timePart || null) : emptyLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => emit(formatDateValue(d), timePart)}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(currentYear - 5, 0)}
            endMonth={new Date(currentYear + 5, 11)}
            locale={es}
            autoFocus
          />
          <div className="border-t sm:border-t-0 sm:border-l">
            <TimeColumns
              value={timePart}
              onChange={(t) => emit(datePart || formatDateValue(new Date()), t)}
            />
          </div>
        </div>
        <Footer onClear={value ? () => { onChange(""); setOpen(false); } : undefined} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
