"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface Person {
  id: string;
  name: string;
  position: string | null;
  days: Day[];
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

export function ScheduleEditor() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<number, { start: string; end: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/time-clock/schedules")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { users: Person[] }) => setPeople(d.users))
      .catch(() => setPeople([]));
  }, []);

  function open(person: Person) {
    setOpenId(person.id);
    const next: Record<number, { start: string; end: string }> = {};
    for (const d of person.days) {
      next[d.weekday] = { start: toTime(d.startMinute), end: toTime(d.endMinute) };
    }
    setDraft(next);
  }

  function toggleDay(weekday: number, on: boolean) {
    setDraft((prev) => {
      const next = { ...prev };
      if (on) next[weekday] = prev[weekday] ?? { start: "09:00", end: "18:00" };
      else delete next[weekday];
      return next;
    });
  }

  async function save() {
    if (!openId) return;
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
        body: JSON.stringify({ userId: openId, days }),
      });
      if (!res.ok) throw new Error();
      setPeople((prev) =>
        prev
          ? prev.map((p) => (p.id === openId ? { ...p, days } : p))
          : prev
      );
      toast.success("Horario guardado.");
      setOpenId(null);
    } catch {
      toast.error("No se pudo guardar el horario.");
    } finally {
      setIsSaving(false);
    }
  }

  if (people === null) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="page-heading">Horarios</h1>
        <p className="text-muted-foreground text-sm">
          El horario de cada colaborador, día por día. Los días que no marques
          significan que ese día no labora.
        </p>
      </div>

      <div className="space-y-2">
        {people.map((person) => {
          const isOpen = openId === person.id;
          return (
            <Card key={person.id}>
              <CardContent className="space-y-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{person.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {person.days.length === 0
                        ? "Sin horario capturado"
                        : `${person.days.length} día${person.days.length === 1 ? "" : "s"} a la semana`}
                      {person.position ? ` · ${person.position}` : ""}
                    </p>
                  </div>
                  <Button
                    variant={isOpen ? "secondary" : "outline"}
                    onClick={() => (isOpen ? setOpenId(null) : open(person))}
                  >
                    {isOpen ? "Cerrar" : person.days.length === 0 ? "Capturar" : "Editar"}
                  </Button>
                </div>

                {isOpen && (
                  <div className="space-y-3 border-t pt-4">
                    {WEEKDAYS.map(({ n, label }) => {
                      const day = draft[n];
                      const crossesMidnight =
                        day !== undefined &&
                        (toMinutes(day.end) ?? 0) <= (toMinutes(day.start) ?? 0);
                      return (
                        <div key={n} className="flex flex-wrap items-center gap-3">
                          <div className="flex w-32 items-center gap-2">
                            <Checkbox
                              id={`d-${person.id}-${n}`}
                              checked={day !== undefined}
                              onCheckedChange={(v) => toggleDay(n, v === true)}
                            />
                            <Label htmlFor={`d-${person.id}-${n}`} className="font-normal">
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
                                  setDraft((p) => ({ ...p, [n]: { ...p[n], start: e.target.value } }))
                                }
                                className="w-auto"
                              />
                              <span className="text-muted-foreground text-sm">a</span>
                              <Input
                                type="time"
                                aria-label={`Salida ${label}`}
                                value={day.end}
                                onChange={(e) =>
                                  setDraft((p) => ({ ...p, [n]: { ...p[n], end: e.target.value } }))
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

                    <div className="flex gap-2 pt-1">
                      <Button onClick={save} disabled={isSaving}>
                        {isSaving && <Loader2 className="size-4 animate-spin" />}
                        Guardar horario
                      </Button>
                      <Button variant="outline" onClick={() => setOpenId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs">
        La entrada tiene 10 minutos de tolerancia. Quien llegue después tiene que
        escribir el motivo para poder registrar su marca.
      </p>
    </div>
  );
}
