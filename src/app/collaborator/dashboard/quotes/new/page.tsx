import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarrierQuotesTable } from "@/components/dashboard/carrier-quotes/carrier-quotes-table";

export const metadata = {
  title: "Nueva cotización | JTP Logistics",
};

export default function NewQuotePage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/collaborator/dashboard/quotes" aria-label="Volver a cotizaciones">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Nueva cotización</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Filtra por ruta, consulta los transportistas y genera el PDF.
          </p>
        </div>
      </div>
      <CarrierQuotesTable showTermsLink apiEndpoint="/api/collaborator/carrier-quotes" />
    </div>
  );
}
