"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstructionLetterData } from "./instruction-letter-pdf";
import { downloadInstructionLetter, shipmentLetterMissing } from "./shipment-pdf-download";

/** "Generar carta de instrucciones": PDF para el transportista con lo capturado en el formulario. */
export function InstructionLetterButton({ data }: { data: InstructionLetterData }) {
  const [busy, setBusy] = useState(false);
  const missing = shipmentLetterMissing(data);

  async function generate() {
    if (missing.length) {
      toast.error(`Para la carta falta: ${missing.join(", ")}.`);
      return;
    }
    setBusy(true);
    try {
      await downloadInstructionLetter(data);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la carta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={generate} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
      Generar carta de instrucciones
    </Button>
  );
}
