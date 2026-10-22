"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QUOTE_REJECTION_REASONS, type QuoteRejectionReason } from "@/lib/quote-rejection";

export interface RejectionChoice {
  rejectionReason: QuoteRejectionReason;
  rejectionNote: string;
}

/**
 * Pide por qué se perdió una cotización antes de marcarla rechazada. Con ese
 * dato los KPIs dicen por qué se pierde, no solo cuánto.
 */
export function RejectionReasonDialog({
  quoteLabel,
  onCancel,
  onConfirm,
}: {
  /** Folio o cliente de la cotización; null cierra el diálogo. */
  quoteLabel: string | null;
  onCancel: () => void;
  onConfirm: (choice: RejectionChoice) => void;
}) {
  return (
    <Dialog open={quoteLabel !== null} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {/* Se monta en cada apertura: el motivo empieza vacío. */}
        {quoteLabel !== null && <RejectionForm quoteLabel={quoteLabel} onCancel={onCancel} onConfirm={onConfirm} />}
      </DialogContent>
    </Dialog>
  );
}

function RejectionForm({
  quoteLabel,
  onCancel,
  onConfirm,
}: {
  quoteLabel: string;
  onCancel: () => void;
  onConfirm: (choice: RejectionChoice) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const selectContainer = useRef<HTMLDivElement | null>(null);

  const needsNote = reason === "otro";
  const valid = reason !== "" && (!needsNote || note.trim().length >= 3);

  return (
    <>
      <DialogHeader>
        <DialogTitle>¿Por qué se perdió?</DialogTitle>
        <DialogDescription>
          Cotización {quoteLabel}. El motivo alimenta los KPIs de cotizaciones.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4" ref={selectContainer}>
        <div className="space-y-2">
          <Label>Motivo</Label>
          <AppSelect
            value={reason}
            onValueChange={setReason}
            options={QUOTE_REJECTION_REASONS.map((r) => ({ value: r.value, label: r.label }))}
            container={selectContainer}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rejection-note">Detalle{needsNote ? "" : " (opcional)"}</Label>
          <Textarea id="rejection-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <p className="text-muted-foreground text-xs">
            {needsNote ? "Escribe el motivo." : "Por ejemplo, con qué tarifa cerró la competencia."}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={!valid}
          onClick={() => onConfirm({ rejectionReason: reason as QuoteRejectionReason, rejectionNote: note.trim() })}
        >
          Marcar rechazada
        </Button>
      </DialogFooter>
    </>
  );
}
