"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MIN_OFFBOARD_REASON } from "@/lib/offboarding";

export interface OffboardState {
  offboardedOn: string | null;
  offboardReason: string | null;
  offboardedByName: string | null;
}

/** Hoy en la zona de la empresa, en formato de <input type="date">. */
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function longDate(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Aviso de que la persona está dada de baja. Va arriba de su ficha, que se
 * conserva completa: el expediente y las checadas son lo que respalda la baja.
 */
export function OffboardBanner({ state }: { state: OffboardState }) {
  if (!state.offboardedOn) return null;
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-destructive flex items-center gap-2 text-sm font-semibold">
        <UserX className="size-4" />
        Dado de baja el {longDate(state.offboardedOn)}
      </p>
      {state.offboardReason && <p className="mt-1 text-sm">{state.offboardReason}</p>}
      <p className="text-muted-foreground mt-1 text-xs">
        {state.offboardedByName ? `Registró la baja: ${state.offboardedByName}. ` : ""}
        Ya no puede entrar a la plataforma. Su expediente y sus checadas se conservan.
      </p>
    </div>
  );
}

/** Botón "Dar de baja" o "Reactivar", según el estado. */
export function OffboardButton({
  employeeId,
  employeeName,
  state,
  assigned = [],
  onChanged,
}: {
  employeeId: string;
  employeeName: string;
  state: OffboardState;
  /** Lo que todavía tiene a su nombre: "2 laptops", "1 celular"… */
  assigned?: string[];
  onChanged: (next: OffboardState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayKey);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isOff = state.offboardedOn !== null;

  function close() {
    setOpen(false);
    setError(null);
    setReason("");
    setDate(todayKey());
    setPassword(null);
  }

  async function offboard() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/offboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; offboardedByName?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo registrar la baja.");
        return;
      }
      onChanged({ offboardedOn: date, offboardReason: reason.trim(), offboardedByName: data.offboardedByName ?? null });
      toast.success(`${employeeName} quedó dado de baja.`);
      close();
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function reactivate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/offboard`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; password?: string };
      if (!res.ok || !data.password) {
        setError(data.error ?? "No se pudo reactivar.");
        return;
      }
      onChanged({ offboardedOn: null, offboardReason: null, offboardedByName: null });
      setPassword(data.password);
    } catch {
      setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <>
      <Button variant={isOff ? "outline" : "destructive"} onClick={() => setOpen(true)}>
        {isOff ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
        {isOff ? "Reactivar" : "Dar de baja"}
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          {password ? (
            <>
              <DialogHeader>
                <DialogTitle>{employeeName} está activo de nuevo</DialogTitle>
                <DialogDescription>
                  Esta es su contraseña temporal. Es la única vez que se muestra: cópiala y
                  pásasela antes de cerrar.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                <code className="text-password min-w-0 flex-1 break-all text-base font-bold">{password}</code>
                <Button variant="ghost" size="icon" onClick={copy} aria-label="Copiar contraseña">
                  {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={close}>Listo</Button>
              </DialogFooter>
            </>
          ) : isOff ? (
            <>
              <DialogHeader>
                <DialogTitle>Reactivar a {employeeName}</DialogTitle>
                <DialogDescription>
                  Vuelve a las listas activas y se le genera una contraseña temporal para
                  entrar. Conserva los permisos que tenía.
                </DialogDescription>
              </DialogHeader>
              {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={close}>Cancelar</Button>
                <Button onClick={reactivate} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Reactivar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Dar de baja a {employeeName}</DialogTitle>
                <DialogDescription>
                  Se le cierra la sesión y ya no podrá entrar. No se borra nada: su
                  expediente y sus checadas se conservan, y se puede reactivar si regresa.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="off-date">Fecha de baja</Label>
                  <Input
                    id="off-date"
                    type="date"
                    value={date}
                    max={todayKey()}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="off-reason">Motivo</Label>
                  <Textarea id="off-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
                  <p className="text-muted-foreground text-xs">
                    Renuncia, término de contrato, abandono de trabajo… Queda en su ficha.
                  </p>
                </div>
                {assigned.length > 0 && (
                  <p className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs dark:border-amber-500/40 dark:bg-amber-500/10">
                    Todavía tiene a su nombre: {assigned.join(", ")}. La baja no se lo quita;
                    hay que reasignarlo o liberarlo aparte.
                  </p>
                )}
                {error && <p className="text-destructive text-sm font-medium">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={close}>Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={offboard}
                  disabled={busy || !date || reason.trim().length < MIN_OFFBOARD_REASON}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Dar de baja
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** "2 laptops", "1 celular", "3 correos": lo que la persona aún tiene asignado. */
export function assignedSummary(counts: { laptops: number; phones: number; emails: number }): string[] {
  const out: string[] = [];
  if (counts.laptops) out.push(`${counts.laptops} laptop${counts.laptops === 1 ? "" : "s"}`);
  if (counts.phones) out.push(`${counts.phones} celular${counts.phones === 1 ? "" : "es"}`);
  if (counts.emails) out.push(`${counts.emails} correo${counts.emails === 1 ? "" : "s"}`);
  return out;
}
