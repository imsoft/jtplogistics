import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VendorQuotesTable } from "@/components/dashboard/vendor-quotes/vendor-quotes-table";

export const metadata = {
  title: "Cotizador | JTP Logistics",
  description: "Consulta el resumen de targets por ruta y tu comisión",
};

export default function VendorCotizadorPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">
            Cotizador
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Filtra por origen y destino para ver el resumen de precios y tu comisión.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit">
          <Link href="/vendor/dashboard/quotes/new">
            <Plus className="size-4" />
            Nueva cotización
          </Link>
        </Button>
      </div>
      <VendorQuotesTable />
    </div>
  );
}
