import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { Shipment } from "@/types/shipment.types";
import type { InstructionLetterData } from "./instruction-letter-pdf";
import type { CartaPorteData } from "./carta-porte-pdf";

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

export function downloadInstructionLetter(data: InstructionLetterData) {
  return downloadPdf(async (logo) => {
    const { InstructionLetterPdf } = await import("./instruction-letter-pdf");
    return <InstructionLetterPdf data={data} logoUrl={logo("jtp-instruction-logo.jpg")} />;
  }, `carta-de-instrucciones${ecoSuffix(data.eco)}.pdf`);
}

export function downloadCartaPorte(data: CartaPorteData) {
  return downloadPdf(async (logo) => {
    const { CartaPortePdf } = await import("./carta-porte-pdf");
    return <CartaPortePdf data={data} logoUrl={logo("jtp-logistics.png")} />;
  }, `carta-porte${ecoSuffix(data.eco)}.pdf`);
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

export function cartaPorteFromShipment(s: Shipment, unitLabel: string): CartaPorteData {
  return {
    eco: s.eco ?? "",
    client: s.client ?? "",
    pickupDate: s.pickupDate ?? "",
    deliveryDate: s.deliveryDate ?? "",
    origin: s.origin ?? "",
    destination: s.destination ?? "",
    originAddress: s.originAddress ?? "",
    destinationAddress: s.destinationAddress ?? "",
    product: s.product ?? "",
    unit: unitLabel,
    legalName: s.legalName ?? "",
    operatorName: s.operatorName ?? "",
    phone: s.phone ?? "",
    truck: s.truck ?? "",
    trailer: s.trailer ?? "",
    comments: s.comments ?? "",
  };
}
