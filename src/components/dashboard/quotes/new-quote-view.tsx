import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarrierQuotesTable } from "@/components/dashboard/carrier-quotes/carrier-quotes-table";
import { QUOTE_SCOPE_LABELS, quotesBase, type QuoteScope } from "@/lib/quote-scope";

/** Pantalla de "Nueva cotización" de un cotizador, en el panel de admin o de colaborador. */
export function NewQuoteView({ panel, scope }: { panel: "admin" | "collaborator"; scope: QuoteScope }) {
  const base = quotesBase(panel, scope);
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={base} aria-label="Volver a cotizaciones">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Nueva cotización</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            {QUOTE_SCOPE_LABELS[scope]} · Filtra por ruta, consulta los transportistas y genera el PDF.
          </p>
        </div>
      </div>
      {panel === "admin" ? (
        <CarrierQuotesTable showTermsLink clientsEndpoint="/api/admin/clients?all=1" listPath={base} scope={scope} />
      ) : (
        <CarrierQuotesTable
          apiEndpoint="/api/collaborator/carrier-quotes"
          clientsEndpoint="/api/collaborator/clients?all=1"
          listPath={base}
          scope={scope}
        />
      )}
    </div>
  );
}
