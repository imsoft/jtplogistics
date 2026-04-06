import { Separator } from "@/components/ui/separator";
import { CarrierQuotesTable } from "@/components/dashboard/carrier-quotes/carrier-quotes-table";

export const metadata = {
  title: "Cotizador | JTP Logistics",
  description: "Ver transportistas disponibles por ruta y sus targets",
};

export default function CotizadorPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">
          Cotizador
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Filtra por origen y destino para ver los transportistas que tienen
          esa ruta y su target. Al final verás el promedio, venta y monto.
        </p>
      </div>
      <Separator />
      <CarrierQuotesTable />
    </div>
  );
}
