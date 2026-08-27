"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/skeletons";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  CarrierQuotesTable,
  type EditQuote,
} from "@/components/dashboard/carrier-quotes/carrier-quotes-table";
import { QuoteComments } from "@/components/dashboard/quotes/quote-comments";
import { QuoteDownloadButton } from "@/components/dashboard/quotes/quote-download-button";
import { QuoteSendButton } from "@/components/dashboard/quotes/quote-send-button";

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quote, setQuote] = useState<EditQuote | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/generated-quotes/${id}`);
    if (!res.ok) {
      setError("No se pudo cargar la cotización.");
      setIsLoaded(true);
      return;
    }
    const data = await res.json();
    setQuote({
      id: data.id,
      quoteNumber: data.quoteNumber,
      company: data.company,
      contact: data.contact,
      phone: data.phone ?? "",
      email: data.email ?? null,
      validUntil: data.validUntil,
      rows: data.rows ?? [],
      creatorName: data.creatorName,
      creatorPosition: data.creatorPosition ?? undefined,
    });
    setIsLoaded(true);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    await fetch(`/api/admin/generated-quotes/${id}`, { method: "DELETE" });
    router.push("/admin/dashboard/quotes");
    router.refresh();
  }

  if (!isLoaded) return <FormSkeleton />;
  if (error || !quote)
    return <p className="text-sm text-destructive">{error ?? "No se encontró la cotización."}</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Header — mismo estilo que "Nueva cotización", con número y eliminar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/dashboard/quotes" aria-label="Volver a cotizaciones">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="page-heading truncate">Editar cotización</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
              {quote.quoteNumber} · Filtra por ruta y actualiza los datos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <QuoteDownloadButton id={id} quoteNumber={quote.quoteNumber} />
          <QuoteSendButton id={id} quoteNumber={quote.quoteNumber} />
          <DeleteConfirmDialog
            title="¿Eliminar cotización?"
            description={`Esta acción no se puede deshacer. Se eliminará la cotización ${quote.quoteNumber} del historial.`}
            onConfirm={handleDelete}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CarrierQuotesTable editQuote={quote} showTermsLink />
        </div>
        <div>
          <QuoteComments quoteId={id} />
        </div>
      </div>
    </div>
  );
}
