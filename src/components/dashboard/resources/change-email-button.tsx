"use client";

import { useEffect, useState } from "react";
import { AtSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { Skeleton } from "@/components/ui/skeleton";

interface ChangeResult {
  email: string;
  previousEmail: string;
  closedSessions: number;
}

/** Un buzón administrativo del catálogo de Correos. */
interface EmailOption {
  id: string;
  email: string;
  isCurrent: boolean;
  /** Nombre de quien ya entra con él, si está tomado. */
  takenBy: string | null;
}

/**
 * Cambia el correo con el que el colaborador entra a la plataforma.
 *
 * Va aparte del formulario de la ficha porque no es un dato más: le cierra la
 * sesión y a partir de ahí entra con otro correo. La contraseña sigue siendo
 * la misma; para esa está ResetPasswordButton.
 *
 * No se escribe a mano: se elige de los buzones administrativos que ya están
 * dados de alta en Correos. Así el acceso siempre corresponde a un buzón real
 * de la empresa y no se cuela un dedazo.
 */
export function ChangeEmailButton({
  employeeId,
  employeeName,
  currentEmail,
  onChanged,
}: {
  employeeId: string;
  employeeName: string;
  currentEmail: string;
  /** Para que la ficha se refresque con el correo nuevo al cerrar. */
  onChanged?: (email: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [options, setOptions] = useState<EmailOption[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeResult | null>(null);

  // Se piden al abrir y no al montar: son varias fichas por pantalla y casi
  // ninguna termina en un cambio de correo.
  useEffect(() => {
    if (!open || options) return;
    let cancelled = false;
    fetch(`/api/employees/${employeeId}/change-email`)
      .then((r) => r.json())
      .then((d: { accounts?: EmailOption[] }) => {
        if (!cancelled) setOptions(d.accounts ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setError("No se pudieron cargar los correos administrativos.");
        }
      });
    return () => { cancelled = true; };
  }, [open, options, employeeId]);

  function reset() {
    setEmail("");
    setError(null);
    setResult(null);
    // Se vuelven a pedir: después de un cambio, el correo que se acaba de
    // asignar ya no está libre y el anterior sí.
    setOptions(null);
  }

  // Los tomados y el actual se quedan fuera: elegirlos no haría nada.
  const selectable = (options ?? []).filter((o) => !o.isCurrent && !o.takenBy);
  const unavailable = (options ?? []).filter((o) => o.takenBy);

  async function handleChange() {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/change-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as ChangeResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo cambiar el correo.");
        return;
      }
      setResult(data);
      onChanged?.(data.email);
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <AtSign className="size-4" />
        Cambiar correo de acceso
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {result ? (
            <>
              <DialogHeader>
                <DialogTitle>Correo actualizado</DialogTitle>
                <DialogDescription>
                  {employeeName} entra desde ahora con su correo nuevo. La contraseña
                  no cambió.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Antes</p>
                  <p className="break-all text-sm lowercase line-through">{result.previousEmail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Ahora</p>
                  <p className="break-all text-base font-bold lowercase">{result.email}</p>
                </div>

                <p className="text-sm text-muted-foreground">
                  {result.closedSessions > 0
                    ? `Se cerraron ${result.closedSessions} sesión${result.closedSessions === 1 ? "" : "es"} abiertas: tendrá que entrar de nuevo con el correo nuevo.`
                    : "No tenía sesiones abiertas."}
                </p>

                <p className="text-sm text-muted-foreground">
                  No se le mandó ningún aviso: hay que decirle cuál es su acceso nuevo.
                </p>
              </div>

              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Listo</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Cambiar correo de acceso</DialogTitle>
                <DialogDescription>
                  Con este correo entra {employeeName} a la plataforma. Al cambiarlo se
                  cierran sus sesiones abiertas y el anterior deja de servir.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Correo actual</Label>
                  <p className="break-all text-sm lowercase text-muted-foreground">
                    {currentEmail}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Correo nuevo</Label>
                  {options === null ? (
                    <Skeleton className="h-9 w-full" />
                  ) : selectable.length > 0 ? (
                    <AppSelect
                      value={email}
                      onValueChange={(v) => { setEmail(v); setError(null); }}
                      options={selectable.map((o) => ({ value: o.email, label: o.email }))}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay ningún correo administrativo libre para asignarle. Da de
                      alta el buzón nuevo en la sección de Correos y vuelve aquí.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Solo salen los buzones administrativos dados de alta en Correos:
                    con esos se entra a la plataforma.
                  </p>
                  {unavailable.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      No aparecen los que ya usa alguien más:{" "}
                      {unavailable.map((o) => `${o.email} (${o.takenBy})`).join(", ")}.
                    </p>
                  )}
                </div>

                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleChange} disabled={isSaving || !email}>
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <AtSign className="size-4" />}
                  {isSaving ? "Cambiando…" : "Cambiar correo"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
