"use client";

import type { QuoteRow } from "@/types/carrier-quote.types";

/** La cotización tal como la devuelve el endpoint del rol. */
export interface StoredQuote {
  quoteNumber: string;
  company: string;
  contact: string;
  phone: string | null;
  email: string | null;
  validUntil: string;
  rows: QuoteRow[];
  creatorName: string;
  creatorPosition?: string | null;
}

/**
 * Rearma el PDF de una cotización ya guardada, con su información actual
 * (incluidas las ediciones posteriores).
 *
 * Los imports son dinámicos a propósito: @react-pdf/renderer pesa y no tiene
 * por qué cargarse al abrir el listado, solo cuando alguien pide el PDF.
 */
export async function buildQuotePdf({
  id,
  apiEndpoint,
}: {
  id: string;
  apiEndpoint: string;
}): Promise<{ quote: StoredQuote; blob: Blob }> {
  const [quoteRes, termsRes] = await Promise.all([
    fetch(`${apiEndpoint}/${id}`),
    fetch("/api/quote-config"),
  ]);
  if (!quoteRes.ok) throw new Error("No se pudo cargar la cotización");

  const quote = (await quoteRes.json()) as StoredQuote;
  const termsJson = termsRes.ok
    ? await termsRes.json()
    : { bulletsJson: "", contractJson: "", privacyJson: "", limitsJson: "" };

  const [{ pdf }, { QuotePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/dashboard/carrier-quotes/quote-pdf"),
  ]);

  const blob = await pdf(
    <QuotePdf
      data={{
        quoteNumber: quote.quoteNumber,
        company: quote.company,
        contact: quote.contact,
        phone: quote.phone ?? "",
        email: quote.email ?? "",
        validUntil: quote.validUntil,
        rows: quote.rows,
      }}
      logoUrl={window.location.origin + "/images/logo/jtp-logistics.png"}
      termsJson={termsJson}
      creatorName={quote.creatorName}
      creatorPosition={quote.creatorPosition ?? undefined}
    />
  ).toBlob();

  return { quote, blob };
}

/** El PDF en base64 sin el prefijo `data:`, que es como lo espera el envío. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Descarga el PDF ya armado con el nombre de archivo de la cotización. */
export function downloadQuotePdf(blob: Blob, quoteNumber: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Cotizacion-${quoteNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
