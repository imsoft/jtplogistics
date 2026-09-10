"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Day {
  weekday: number;
  startMinute: number;
  endMinute: number;
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
 * Se guarda aparte del resto del formulario a propósito: cambiarle el horario
 * a alguien cambia desde cuándo se le cuentan retardos, y eso no debería
 * viajar escondido en el mismo "guardar cambios" que su teléfono.
 */
export function EmployeeScheduleCard({ userId }: { userId: string }) {
  const [draft, setDraft] = useState<Record<number, { start: string; end: string }> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  function toggleDay(weekday: number, on: boolean) {
    setDraft((prev) => {
      const next = { ...(prev ?? {}) };
      if (on) next[weekday] = prev?.[weekday] ?? { start: "09:00", end: "18:00" };
      else delete next[weekday];
      return next;
    });
  }

  async function save() {
    if (!draft) return;
    const days: Day[] = [];
    for (const [weekday, v] of Object.entries(draft)) {
      const startMinute = toMinutes(v.start);
      const endMinute = toMinutes(v.end);
      if (startMinute === null || endMinute === null) {
        toast.error("Revisa las horas: alguna no es válida.");
        return;
      }
      days.push({ weekday: Number(weekday), startMinute, endMinute });
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/time-clock/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, days }),
      });
      if (!res.ok) throw new Error();
      toast.success("Horario guardado.");
    } catch {
      toast.error("No se pudo guardar el horario.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-left text-base sm:text-lg">Horario</CardTitle>
        <CardDescription className="text-left text-xs sm:text-sm">
          Los días que no marques significan que no labora ese día. La entrada tiene
          10 minutos de tolerancia; después de eso es retardo y tiene que escribir
          el motivo para poder marcar.
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

            <Button type="button" onClick={save} disabled={isSaving} className="mt-1">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Guardar horario
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
