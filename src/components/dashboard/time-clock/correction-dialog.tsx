"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, PencilLine } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";

const KIND_OPTIONS = [
  { value: "adjust", label: "Corregir la hora" },
  { value: "void", label: "Anular la marca" },
];

/**
 * Corrige una checada. Solo dirección llega aquí.
 *
 * La original no se toca: esto escribe un renglón nuevo que apunta a ella, con
 * motivo y autor, y en el registro se ven las dos.
 */
export function CorrectionDialog({
  entryId,
  personName,
  markLabel,
  currentTime,
  onDone,
}: {
  entryId: string;
  personName: string;
  markLabel: string;
  /** ISO de la marca, para precargar la hora. */
  currentTime: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("adjust");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    const d = new Date(currentTime);
    // El input necesita la hora local del navegador, no la UTC.
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    setTime(local.toISOString().slice(0, 16));
    setKind("adjust");
    setReason("");
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/time-clock/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          entryId,
          reason: reason.trim(),
          ...(kind === "adjust" ? { markedAt: new Date(time).toISOString() } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo corregir.");
        return;
      }
      toast.success("Corrección registrada.");
      setOpen(false);
      onDone();
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Corregir marca" onClick={start}>
        <PencilLine className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Corregir marca</DialogTitle>
            <DialogDescription>
              {markLabel} de {personName}. La marca original no se borra: queda
              guardada y en el registro se ven las dos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Qué se hace</Label>
              <AppSelect
                value={kind}
                onValueChange={setKind}
                options={KIND_OPTIONS}
                className="w-full"
              />
            </div>

            {kind === "adjust" && (
              <div className="space-y-2">
                <Label htmlFor="corr-time">Hora correcta</Label>
                <Input
                  id="corr-time"
                  type="datetime-local"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="corr-reason">Por qué se corrige</Label>
              <Textarea
                id="corr-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Queda con tu nombre en el registro y en la bitácora. Sin motivo no se
                puede corregir.
              </p>
            </div>

            {error && <p className="text-destructive text-sm font-medium">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={isSaving || !reason.trim()}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              Guardar corrección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
