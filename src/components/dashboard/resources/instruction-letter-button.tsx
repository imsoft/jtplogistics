"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstructionLetterData } from "./instruction-letter-pdf";

/** "Generar carta de instrucciones": PDF para el transportista con lo capturado en el formulario. */
export function InstructionLetterButton({ data }: { data: InstructionLetterData }) {
  const [busy, setBusy] = useState(false);
  const missing = [
    !data.origin.trim() && "origen",
    !data.destination.trim() && "destino",
    !data.legalName.trim() && "transportista",
  ].filter(Boolean) as string[];

  async function generate() {
    if (missing.length) {
      toast.error(`Para la carta falta: ${missing.join(", ")}.`);
      return;
    }
    setBusy(true);
    try {
      const [{ pdf }, { InstructionLetterPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./instruction-letter-pdf")]);
      const blob = await pdf(<InstructionLetterPdf data={data} logoUrl={`${window.location.origin}/images/logo/jtp-instruction-logo.jpg`} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carta-de-instrucciones${data.eco ? `-${data.eco.replace(/[^\w-]+/g, "")}` : ""}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
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
