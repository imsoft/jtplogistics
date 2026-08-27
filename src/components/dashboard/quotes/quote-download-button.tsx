"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildQuotePdf,
  downloadQuotePdf,
} from "@/components/dashboard/quotes/build-quote-pdf";

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
      const { quote, blob } = await buildQuotePdf({ id, apiEndpoint });
      downloadQuotePdf(blob, quote.quoteNumber);
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
      aria-label={`Descargar PDF de cotización ${quoteNumber}`}
      aria-disabled={isDownloading}
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
