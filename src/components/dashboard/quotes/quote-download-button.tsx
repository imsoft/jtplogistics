"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { QuoteRow } from "@/types/carrier-quote.types";

export function QuoteDownloadButton({
  id,
  quoteNumber,
  apiEndpoint = "/api/admin/generated-quotes",
}: {
  id: string;
  quoteNumber: string;
  apiEndpoint?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownloadPdf() {
    setIsDownloading(true);
    try {
      const [quoteRes, termsRes] = await Promise.all([
        fetch(`${apiEndpoint}/${id}`),
        fetch("/api/quote-config"),
      ]);
      if (!quoteRes.ok) throw new Error("No se pudo cargar la cotización");
      const quote = await quoteRes.json() as {
        quoteNumber: string;
        company: string;
        contact: string;
        phone: string | null;
        validUntil: string;
        rows: QuoteRow[];
        creatorName: string;
      };
      const termsJson = termsRes.ok
        ? await termsRes.json()
        : { bulletsJson: "", contractJson: "", privacyJson: "", limitsJson: "" };

      const [{ pdf }, { QuotePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/dashboard/carrier-quotes/quote-pdf"),
      ]);
      const logoUrl = window.location.origin + "/images/logo/jtp-logistics.png";
      const blob = await pdf(
        <QuotePdf
          data={{
            quoteNumber: quote.quoteNumber,
            company: quote.company,
            contact: quote.contact,
            phone: quote.phone ?? "",
            validUntil: quote.validUntil,
            rows: quote.rows,
          }}
          logoUrl={logoUrl}
          termsJson={termsJson}
          creatorName={quote.creatorName}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion-${quote.quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF de la cotización.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownloadPdf}
      disabled={isDownloading}
      aria-label="Descargar PDF"
      className="gap-2"
    >
      {isDownloading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <FileText className="size-3.5" />
      )}
      {isDownloading ? "Descargando..." : "Descargar PDF"}
    </Button>
  );
}
