"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Holiday {
  id: string;
  date: string;
  name: string;
}

function longDate(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * Días festivos del checador. Solo vive en el panel de dirección.
 *
 * Se guarda al momento, sin pasar por "Guardar configuración": agregar o
 * quitar un festivo es una acción sobre un día concreto, no un ajuste más.
 */
export function HolidaysCard() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [holidays, setHolidays] = useState<Holiday[] | null>(null);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"add" | "preload" | string | null>(null);

  const load = useCallback(() => {
    setHolidays(null);
    fetch(`/api/time-clock/holidays?year=${year}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { holidays: Holiday[] }) => setHolidays(d.holidays))
      .catch(() => setHolidays([]));
  }, [year]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    setBusy("add");
    try {
      const res = await fetch("/api/time-clock/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, name: name.trim() }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo agregar el festivo.");
        return;
      }
      toast.success("Festivo agregado.");
      setDate("");
      setName("");
      if (date.startsWith(String(year))) load();
    } finally {
      setBusy(null);
    }
  }

  async function preload() {
    setBusy("preload");
    try {
      const res = await fetch("/api/time-clock/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preloadYear: year }),
      });
      const d = (await res.json().catch(() => ({}))) as { added?: number; error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "No se pudieron cargar.");
        return;
      }
      toast.success(
        d.added ? `Se agregaron ${d.added} días de la ley.` : "Ya estaban todos los de la ley."
      );
      load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(h: Holiday) {
    setBusy(h.id);
    try {
      const res = await fetch(`/api/time-clock/holidays?id=${h.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo quitar el festivo.");
        return;
      }
      setHolidays((prev) => prev?.filter((x) => x.id !== h.id) ?? prev);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Días festivos</CardTitle>
        <CardDescription>
          En un festivo se puede marcar igual, pero la jornada no se juzga: no hay
          retardos, ni motivo obligatorio, ni incidencias. Los cambios se guardan
          al momento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)} aria-label="Año anterior">
            ‹
          </Button>
          <span className="w-14 text-center font-semibold tabular-nums">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)} aria-label="Año siguiente">
            ›
          </Button>
          <Button variant="outline" size="sm" onClick={preload} disabled={busy !== null} className="ml-auto">
            {busy === "preload" ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
            Cargar los de la ley {year}
          </Button>
        </div>

        {holidays === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : holidays.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay festivos capturados en {year}.</p>
        ) : (
          <div className="rounded-md border">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-muted-foreground text-xs">{longDate(h.date)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar ${h.name}`}
                  onClick={() => remove(h)}
                  disabled={busy !== null}
                >
                  {busy === h.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 border-t pt-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="hol-date">Fecha</Label>
            <Input id="hol-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hol-name">Nombre</Label>
            <Input id="hol-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={add} disabled={busy !== null || !date || !name.trim()}>
            {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          La ley no fija de antemano la jornada electoral ni los días que la empresa
          decida dar: esos se agregan a mano.
        </p>
      </CardContent>
    </Card>
  );
}
