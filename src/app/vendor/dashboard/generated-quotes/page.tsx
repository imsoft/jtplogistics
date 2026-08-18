"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { QuotesCrmTable, type CrmQuote } from "@/components/dashboard/quotes/quotes-crm-table";

export default function VendorGeneratedQuotesPage() {
  const [quotes, setQuotes] = useState<CrmQuote[] | null>(null);

  useEffect(() => {
    fetch("/api/vendor/generated-quotes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CrmQuote[]) => setQuotes(Array.isArray(data) ? data : []))
      .catch(() => setQuotes([]));
  }, []);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-heading">Mis cotizaciones</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Las cotizaciones que has generado. Puedes volver a descargar su PDF.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit">
          <Link href="/vendor/dashboard/quotes/new">
            <Plus className="size-4" />
            Nueva cotización
          </Link>
        </Button>
      </div>

      {!quotes ? (
        <DataTableSkeleton />
      ) : (
        // El vendedor consulta y descarga; el estado y la edición los maneja el
        // equipo de JTP desde su propio tablero.
        <QuotesCrmTable
          initialQuotes={quotes}
          apiEndpoint="/api/vendor/generated-quotes"
          canUpdateStatus={false}
          canEdit={false}
          canDelete={false}
        />
      )}
    </div>
  );
}
