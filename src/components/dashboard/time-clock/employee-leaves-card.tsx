"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSelect } from "@/components/ui/app-select";
import { LEAVE_KINDS, LEAVE_LABELS, type LeaveKind } from "@/lib/time-clock-leaves";

interface Leave {
  id: string;
  kind: LeaveKind;
  startDate: string;
  endDate: string;
  note: string | null;
  createdByName: string | null;
}

function longDate(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Vacaciones, home office, incapacidad y permiso del colaborador.
 *
 * Se guarda al momento y no con el resto de la ficha: agregar o quitar un
 * periodo es una acción sobre fechas concretas, no un dato más de la persona.
 */
export function EmployeeLeavesCard({ userId }: { userId: string }) {
  const [leaves, setLeaves] = useState<Leave[] | null>(null);
  const [kind, setKind] = useState<string>("vacaciones");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/time-clock/leaves?userId=${userId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { leaves: Leave[] }) => setLeaves(d.leaves))
      .catch(() => setLeaves([]));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    setBusy("add");
    try {
      const res = await fetch("/api/time-clock/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Un solo día: basta con la fecha de inicio.
        body: JSON.stringify({ userId, kind, startDate, endDate: endDate || startDate, note }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "No se pudo programar.");
        return;
      }
      toast.success("Periodo programado.");
      setStartDate("");
      setEndDate("");
      setNote("");
      load();
    } finally {
      setBusy(null);
    }
  }

  async function remove(leave: Leave) {
    setBusy(leave.id);
    try {
      const res = await fetch(`/api/time-clock/leaves?id=${leave.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("No se pudo quitar el periodo.");
        return;
      }
      setLeaves((prev) => prev?.filter((l) => l.id !== leave.id) ?? prev);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-left text-base sm:text-lg">Vacaciones y home office</CardTitle>
        <CardDescription className="text-left text-xs sm:text-sm">
          En estos días puede marcar desde donde esté, sin necesidad de estar en la
          oficina. En home office se le siguen contando sus retardos; en los demás no
          se le anota nada. Los cambios se guardan al momento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {leaves === null ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : leaves.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tiene periodos programados.</p>
        ) : (
          <div className="rounded-md border">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {LEAVE_LABELS[l.kind]}
                    {l.note ? ` · ${l.note}` : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {l.startDate === l.endDate
                      ? longDate(l.startDate)
                      : `Del ${longDate(l.startDate)} al ${longDate(l.endDate)}`}
                    {l.createdByName ? ` · lo programó ${l.createdByName}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar ${LEAVE_LABELS[l.kind]}`}
                  onClick={() => remove(l)}
                  disabled={busy !== null}
                >
                  {busy === l.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <AppSelect
              value={kind}
              onValueChange={setKind}
              options={LEAVE_KINDS.map((k) => ({ value: k.value, label: k.label }))}
              className="w-full sm:w-64"
            />
            <p className="text-muted-foreground text-xs">
              {LEAVE_KINDS.find((k) => k.value === kind)?.hint}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leave-start">Del</Label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end">Al</Label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
              <p className="text-muted-foreground text-xs">
                Si es un solo día, déjalo vacío.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leave-note">Nota</Label>
            <Input id="leave-note" value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="text-muted-foreground text-xs">
              Opcional. Sale en el registro junto al periodo.
            </p>
          </div>

          <Button type="button" onClick={add} disabled={busy !== null || !startDate}>
            {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Programar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
