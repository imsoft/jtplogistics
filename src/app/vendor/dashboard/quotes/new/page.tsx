import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarrierQuotesTable } from "@/components/dashboard/carrier-quotes/carrier-quotes-table";
import { requireVendedorPage } from "@/lib/auth-server";

export const metadata = {
  title: "Nueva cotización | JTP Logistics",
};

export default async function VendorNewQuotePage() {
  await requireVendedorPage();

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/vendor/dashboard/generated-quotes" aria-label="Volver a mis cotizaciones">
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
      {/* El endpoint del vendedor sirve las mismas rutas y transportistas que el
          de admin; las cotizaciones que genere quedan a su nombre. */}
      <CarrierQuotesTable
        apiEndpoint="/api/vendor/carrier-quotes"
        listPath="/vendor/dashboard/generated-quotes"
      />
    </div>
  );
}
