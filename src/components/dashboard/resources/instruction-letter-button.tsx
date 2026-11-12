"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstructionLetterData } from "./instruction-letter-pdf";
import { downloadCartaPorte, downloadInstructionLetter, shipmentLetterMissing } from "./shipment-pdf-download";

function PdfButton({
  data,
  label,
  icon: Icon,
  download,
}: {
  data: InstructionLetterData;
  label: string;
  icon: React.ElementType;
  download: (data: InstructionLetterData) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    const missing = shipmentLetterMissing(data);
    if (missing.length) {
      toast.error(`Para la carta falta: ${missing.join(", ")}.`);
      return;
    }
    setBusy(true);
    try {
      await download(data);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la carta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={generate} disabled={busy} className="w-full sm:w-auto">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {label}
    </Button>
  );
}

/** "Generar carta de instrucciones": PDF para el transportista con lo capturado en el formulario. */
export function InstructionLetterButton({ data }: { data: InstructionLetterData }) {
  return <PdfButton data={data} label="Generar carta de instrucciones" icon={FileText} download={downloadInstructionLetter} />;
}

/** "Generar carta porte": documento de traslado con lo capturado en el formulario. */
export function CartaPorteButton({ data }: { data: InstructionLetterData }) {
  return (
    <PdfButton
      data={data}
      label="Generar carta porte"
      icon={Truck}
      download={(d) =>
        downloadCartaPorte({
          eco: d.eco,
          client: d.client,
          pickupDate: d.pickupDate,
          deliveryDate: d.deliveryDate,
          origin: d.origin,
          destination: d.destination,
          originAddress: d.originAddress,
          destinationAddress: d.destinationAddress,
          product: d.product,
          unit: d.unit,
          legalName: d.legalName,
          operatorName: d.operatorName,
          phone: d.phone,
          truck: d.truck,
          trailer: d.trailer,
          comments: d.comments ?? "",
        })
      }
    />
  );
}
