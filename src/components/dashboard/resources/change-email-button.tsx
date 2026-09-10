"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangeResult {
  email: string;
  previousEmail: string;
  closedSessions: number;
}

/**
 * Cambia el correo con el que el colaborador entra a la plataforma.
 *
 * Va aparte del formulario de la ficha porque no es un dato más: le cierra la
 * sesión y a partir de ahí entra con otro correo. La contraseña sigue siendo
 * la misma; para esa está ResetPasswordButton.
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeResult | null>(null);

  function reset() {
    setEmail("");
    setError(null);
    setResult(null);
  }

  async function handleChange() {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/change-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
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
                  <Label htmlFor="new-login-email">Correo nuevo</Label>
                  <Input
                    id="new-login-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Es solo el correo de acceso. Los buzones corporativos que tenga
                    asignados se administran en la sección de Correos.
                  </p>
                </div>

                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleChange} disabled={isSaving || !email.trim()}>
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
