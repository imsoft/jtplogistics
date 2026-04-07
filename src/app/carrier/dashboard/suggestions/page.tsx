import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { CarrierSuggestionsTable } from "@/components/dashboard/carrier-suggestions/carrier-suggestions-table";

export const metadata = {
  title: "Sugerencias | JTP Logistics",
  description: "Envía sugerencias para mejorar el sistema o el servicio",
};

export default function CarrierSuggestionsPage() {
  return (
    <ResourceListPage
      title="Mis sugerencias"
      description="Propuestas enviadas al equipo. Solo puedes editar o eliminar las que siguen pendientes de revisión."
      newHref="/carrier/dashboard/suggestions/new"
      newLabel="Nueva sugerencia"
    >
      <CarrierSuggestionsTable mode="carrier" />
    </ResourceListPage>
  );
}
