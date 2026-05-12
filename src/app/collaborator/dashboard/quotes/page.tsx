"use client";

import { Separator } from "@/components/ui/separator";
import { CarrierQuotesTable } from "@/components/dashboard/carrier-quotes/carrier-quotes-table";

export default function CollaboratorQuotesPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Cotizador</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Filtra por origen y destino para ver los transportistas que tienen
          esa ruta y su target.
        </p>
      </div>
      <Separator />
      <CarrierQuotesTable apiEndpoint="/api/collaborator/carrier-quotes" />
    </div>
  );
}
