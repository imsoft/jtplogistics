"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { QuoteRow } from "@/types/carrier-quote.types";

export function QuoteRowActions({
  id,
  quoteNumber,
  apiEndpoint = "/api/admin/generated-quotes",
}: {
  id: string;
  quoteNumber: string;
  apiEndpoint?: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const endpoint = apiEndpoint.includes("/collaborator/")
      ? `${apiEndpoint}/${id}/delete`
      : `${apiEndpoint}/${id}`;
    await fetch(endpoint, { method: "DELETE" });
    router.refresh();
  }

  // Regenera el PDF con la información actual de la cotización (incluye ediciones).
  // Imports dinámicos para no cargar @react-pdf/renderer al abrir el CRM.
  async function handleDownloadPdf() {
    setIsDownloading(true);
    try {
      const [quoteRes, termsRes] = await Promise.all([
        fetch(`${apiEndpoint}/${id}`),
        fetch("/api/admin/quote-config"),
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
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={handleDownloadPdf}
        disabled={isDownloading}
        aria-label="Descargar PDF con la información actual"
        title="Descargar PDF con la información actual"
      >
        {isDownloading ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
      </Button>
      <Button variant="ghost" size="icon" className="size-7" asChild>
        <Link href={`/admin/dashboard/quotes/${id}/edit`} aria-label="Editar cotización">
          <Pencil className="size-3.5" />
        </Link>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" disabled={isDeleting} aria-label="Eliminar cotización">
            <Trash2 className="size-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {quoteNumber} del historial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
