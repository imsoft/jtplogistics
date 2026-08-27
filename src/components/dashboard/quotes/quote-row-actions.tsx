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
import {
  buildQuotePdf,
  downloadQuotePdf,
} from "@/components/dashboard/quotes/build-quote-pdf";
import { QuoteSendButton } from "@/components/dashboard/quotes/quote-send-button";

export function QuoteRowActions({
  id,
  quoteNumber,
  apiEndpoint = "/api/admin/generated-quotes",
  editBase = "/admin/dashboard/quotes",
  canEdit = true,
  canDelete = true,
}: {
  id: string;
  quoteNumber: string;
  apiEndpoint?: string;
  editBase?: string;
  canEdit?: boolean;
  canDelete?: boolean;
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
      <QuoteSendButton
        id={id}
        quoteNumber={quoteNumber}
        apiEndpoint={apiEndpoint}
        variant="icon"
      />
      {canEdit && (
        <Button variant="ghost" size="icon" className="size-7" asChild>
          <Link href={`${editBase}/${id}/edit`} aria-label="Editar cotización">
            <Pencil className="size-3.5" />
          </Link>
        </Button>
      )}
      {canDelete && (
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
      )}
    </div>
  );
}
