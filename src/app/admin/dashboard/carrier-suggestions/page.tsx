import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { CarrierSuggestionsTable } from "@/components/dashboard/carrier-suggestions/carrier-suggestions-table";

export const metadata = {
  title: "Sugerencias de transportistas | JTP Logistics",
  description: "Revisa las sugerencias enviadas por los transportistas",
};

export default function AdminCarrierSuggestionsPage() {
  return (
    <ResourceListPage
      title="Sugerencias de transportistas"
      description="Listado de propuestas enviadas por transportistas. Pulsa una fila para ver el detalle y actualizar el estado."
    >
      <CarrierSuggestionsTable mode="admin" />
    </ResourceListPage>
  );
}
