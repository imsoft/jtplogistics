"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetResult {
  password: string;
  closedSessions: number;
  emailed: boolean;
  emailError: string | null;
}

/**
 * Restablece la contraseña con la que el colaborador entra a la plataforma.
 *
 * No se puede "consultar" la anterior: Better Auth la guarda con hash. Por eso
 * el flujo es asignar una nueva y mostrarla una sola vez.
 */
export function ResetPasswordButton({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [notify, setNotify] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setPassword("");
    setNotify(false);
    setError(null);
    setResult(null);
    setCopied(false);
  }

  async function handleReset() {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() || undefined, notify }),
      });
      const data = (await res.json().catch(() => ({}))) as ResetResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo restablecer la contraseña.");
        return;
      }
      setResult(data);
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar.");
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
        <KeyRound className="size-4" />
        Restablecer contraseña
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
                <DialogTitle>Contraseña restablecida</DialogTitle>
                <DialogDescription>
                  Esta es la única vez que se muestra. Cópiala antes de cerrar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                  <code className="min-w-0 flex-1 break-all text-base font-bold tracking-wide">
                    {result.password}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copy} aria-label="Copiar contraseña">
                    {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  {result.closedSessions > 0
                    ? `Se cerraron ${result.closedSessions} sesión${result.closedSessions === 1 ? "" : "es"} abiertas: tendrá que entrar de nuevo.`
                    : "No tenía sesiones abiertas."}
                </p>

                {result.emailed && (
                  <p className="text-sm font-medium text-green-600">
                    Se le avisó por correo con la contraseña temporal.
                  </p>
                )}
                {result.emailError && (
                  <p className="text-sm font-medium text-destructive">
                    La contraseña sí cambió, pero el correo no salió: {result.emailError}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Listo</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Restablecer contraseña</DialogTitle>
                <DialogDescription>
                  Le asignas una contraseña nueva a {employeeName}. La anterior deja
                  de servir y se cierran sus sesiones abiertas.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Contraseña nueva</Label>
                  <Input
                    id="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Déjalo vacío y se genera una temporal. Mínimo 8 caracteres; se
                    guarda en mayúsculas, igual que el correo de aviso.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="notify-user"
                    checked={notify}
                    onCheckedChange={(v) => setNotify(v === true)}
                  />
                  <Label htmlFor="notify-user" className="text-sm font-normal leading-snug">
                    Avisarle por correo con la contraseña temporal
                  </Label>
                </div>

                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleReset} disabled={isSaving}>
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {isSaving ? "Restableciendo…" : "Restablecer"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
