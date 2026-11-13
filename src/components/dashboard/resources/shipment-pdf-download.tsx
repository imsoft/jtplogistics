import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { Shipment } from "@/types/shipment.types";
import type { InstructionLetterData } from "./instruction-letter-pdf";
import type { CartaPorteData } from "./carta-porte-pdf";
import type { CartaPorte } from "@/lib/carta-porte";

/** Lo mínimo para armar la carta: origen, destino y transportista. */
export function shipmentLetterMissing(data: { origin?: string | null; destination?: string | null; legalName?: string | null }): string[] {
  return [
    !data.origin?.trim() && "origen",
    !data.destination?.trim() && "destino",
    !data.legalName?.trim() && "transportista",
  ].filter(Boolean) as string[];
}

function ecoSuffix(eco: string | null | undefined) {
  const clean = (eco ?? "").replace(/[^\w-]+/g, "");
  return clean ? `-${clean}` : "";
}

/** Genera el PDF en el navegador y lo descarga. */
export async function downloadPdf(build: (pdfLogo: (file: string) => string) => Promise<ReactElement<DocumentProps>>, fileName: string) {
  const [{ pdf }, doc] = await Promise.all([
    import("@react-pdf/renderer"),
    build((file) => `${window.location.origin}/images/logo/${file}`),
  ]);
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** La carta porte con lo mismo que la de instrucciones, más sus datos del SAT. */
export function cartaPorteFromLetter(d: InstructionLetterData, sat: CartaPorte | null | undefined): CartaPorteData {
  return {
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
    sat: sat ?? null,
  };
}

/**
 * Un solo PDF con las dos cartas del embarque: primero la de instrucciones y
 * después la carta porte.
 */
export function downloadShipmentLetters(letter: InstructionLetterData, sat: CartaPorte | null | undefined) {
  return downloadPdf(async (logo) => {
    const [{ Document }, { InstructionLetterPage }, { CartaPortePage }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("./instruction-letter-pdf"),
      import("./carta-porte-pdf"),
    ]);
    return (
      <Document title={`Cartas del embarque ${letter.eco || ""}`.trim()}>
        <InstructionLetterPage data={letter} logoUrl={logo("jtp-instruction-logo.jpg")} />
        <CartaPortePage data={cartaPorteFromLetter(letter, sat)} logoUrl={logo("jtp-logistics.png")} />
      </Document>
    );
  }, `cartas-embarque${ecoSuffix(letter.eco)}.pdf`);
}

/** Datos de la carta de instrucciones desde una fila de la tabla (sin la ficha del cliente). */
export function instructionLetterFromShipment(s: Shipment, unitLabel: string): InstructionLetterData {
  return {
    eco: s.eco ?? "",
    client: s.client ?? "",
    product: s.product ?? "",
    pickupDate: s.pickupDate ?? "",
    deliveryDate: s.deliveryDate ?? "",
    legalName: s.legalName ?? "",
    operatorName: s.operatorName ?? "",
    phone: s.phone ?? "",
    truck: s.truck ?? "",
    trailer: s.trailer ?? "",
    unit: unitLabel,
    origin: s.origin ?? "",
    destination: s.destination ?? "",
    originAddress: s.originAddress ?? "",
    destinationAddress: s.destinationAddress ?? "",
    comments: s.comments ?? "",
    // Igual que el formulario cuando no hay ficha de cliente: cliente y celular del embarque.
    originContact: s.client ?? "",
    destinationContact: s.client ?? "",
    originPhone: s.phone ?? "",
    destinationPhone: s.phone ?? "",
  };
}
