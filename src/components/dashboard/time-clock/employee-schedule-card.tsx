"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAYS = [
  { n: 1, label: "Lunes" },
  { n: 2, label: "Martes" },
  { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" },
  { n: 5, label: "Viernes" },
  { n: 6, label: "Sábado" },
  { n: 0, label: "Domingo" },
];

export interface Day {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

/** Guarda el horario. Lo llama la ficha al mandar el formulario completo. */
export async function saveSchedule(userId: string, days: Day[]): Promise<boolean> {
  try {
    const res = await fetch("/api/time-clock/schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, days }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** "09:00" ↔ 540 */
function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * El horario del colaborador, dentro de su propia ficha.
 *
 * No guarda por su cuenta: va con el "Guardar cambios" del formulario. Avisa
 * hacia arriba en cada edición, y manda "invalid" si alguna hora quedó vacía
 * para que la ficha no mande un horario a medias.
 */
export function EmployeeScheduleCard({
  userId,
  onChange,
}: {
  userId: string;
  onChange: (days: Day[] | "invalid") => void;
}) {
  const [draft, setDraft] = useState<Record<number, { start: string; end: string }> | null>(null);

  useEffect(() => {
    fetch(`/api/time-clock/schedules?userId=${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { users: { days: Day[] }[] }) => {
        const next: Record<number, { start: string; end: string }> = {};
        for (const day of d.users[0]?.days ?? []) {
          next[day.weekday] = { start: toTime(day.startMinute), end: toTime(day.endMinute) };
        }
        setDraft(next);
      })
      .catch(() => setDraft({}));
  }, [userId]);

  // Cada cambio sube convertido a minutos; la ficha decide cuándo guardarlo.
  useEffect(() => {
    if (draft === null) return;
    const days: Day[] = [];
    for (const [weekday, v] of Object.entries(draft)) {
      const startMinute = toMinutes(v.start);
      const endMinute = toMinutes(v.end);
      if (startMinute === null || endMinute === null) {
        onChange("invalid");
        return;
      }
      days.push({ weekday: Number(weekday), startMinute, endMinute });
    }
    onChange(days);
  }, [draft, onChange]);

  function toggleDay(weekday: number, on: boolean) {
    setDraft((prev) => {
      const next = { ...(prev ?? {}) };
      if (on) next[weekday] = prev?.[weekday] ?? { start: "09:00", end: "18:00" };
      else delete next[weekday];
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-left text-base sm:text-lg">Horario</CardTitle>
        <CardDescription className="text-left text-xs sm:text-sm">
          Se guarda con el resto de la ficha. Los días que no marques significan que
          no labora ese día. La entrada tiene 10 minutos de tolerancia; después de eso
          es retardo y tiene que escribir el motivo para poder marcar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft === null ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : (
          <>
            {WEEKDAYS.map(({ n, label }) => {
              const day = draft[n];
              const crossesMidnight =
                day !== undefined && (toMinutes(day.end) ?? 0) <= (toMinutes(day.start) ?? 0);
              return (
                <div key={n} className="flex flex-wrap items-center gap-3">
                  <div className="flex w-32 items-center gap-2">
                    <Checkbox
                      id={`sched-${n}`}
                      checked={day !== undefined}
                      onCheckedChange={(v) => toggleDay(n, v === true)}
                    />
                    <Label htmlFor={`sched-${n}`} className="font-normal">
                      {label}
                    </Label>
                  </div>
                  {day && (
                    <>
                      <Input
                        type="time"
                        aria-label={`Entrada ${label}`}
                        value={day.start}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p!, [n]: { ...p![n], start: e.target.value } }))
                        }
                        className="w-auto"
                      />
                      <span className="text-muted-foreground text-sm">a</span>
                      <Input
                        type="time"
                        aria-label={`Salida ${label}`}
                        value={day.end}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p!, [n]: { ...p![n], end: e.target.value } }))
                        }
                        className="w-auto"
                      />
                      {crossesMidnight && (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Moon className="size-3" />
                          Termina al día siguiente
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
