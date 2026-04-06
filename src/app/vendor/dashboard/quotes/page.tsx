import { VendorQuotesTable } from "@/components/dashboard/vendor-quotes/vendor-quotes-table";

export const metadata = {
  title: "Cotizador | JTP Logistics",
  description: "Consulta el resumen de targets por ruta y tu comisión",
};

export default function VendorCotizadorPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">
          Cotizador
        </h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Filtra por origen y destino para ver el resumen de precios y tu comisión.
        </p>
      </div>
      <VendorQuotesTable />
    </div>
  );
}
