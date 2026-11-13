"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartaPorte } from "@/lib/carta-porte";
import type { InstructionLetterData } from "./instruction-letter-pdf";
import { downloadShipmentLetters, shipmentLetterMissing } from "./shipment-pdf-download";

/**
 * "Generar cartas": un solo PDF con la carta de instrucciones y, después, la
 * carta porte, con lo capturado en el formulario.
 */
export function ShipmentLettersButton({ data, cartaPorte }: { data: InstructionLetterData; cartaPorte: CartaPorte | null }) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    const missing = shipmentLetterMissing(data);
    if (missing.length) {
      toast.error(`Para las cartas falta: ${missing.join(", ")}.`);
      return;
    }
    setBusy(true);
    try {
      await downloadShipmentLetters(data, cartaPorte);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron generar las cartas.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={generate} disabled={busy} className="w-full sm:w-auto">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
      Generar carta de instrucciones y carta porte
    </Button>
  );
}
