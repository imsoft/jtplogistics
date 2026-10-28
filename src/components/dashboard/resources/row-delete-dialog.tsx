"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Confirmación para eliminar desde una fila de tabla. Con `requireEmail`, pide
 * el correo de quien elimina (embarques cerrados: solo dirección, igual que
 * para desbloquearlos).
 */
export function RowDeleteDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  requireEmail = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  requireEmail?: boolean;
  /** Lanza un Error con el mensaje a mostrar si no se pudo. */
  onConfirm: (confirmEmail: string) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setEmail("");
    setError(null);
    onClose();
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(email.trim());
      setEmail("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {requireEmail && (
          <div className="space-y-1.5">
            <Label htmlFor="row-delete-email">Tu correo electrónico</Label>
            <Input id="row-delete-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            <p className="text-muted-foreground text-xs">Está cerrado: confirma con tu correo para eliminarlo.</p>
          </div>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={busy || (requireEmail && !email.trim())}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
