import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { UnitTypesTable } from "@/components/dashboard/unit-types/unit-types-table";

export const metadata = {
  title: "Tipos de Unidades | JTP Logistics",
  description: "Gestionar tipos de unidades",
};

export default function CollaboratorUnitTypesPage() {
  return (
    <ResourceListPage
      title="Tipos de unidades"
      description="Tipos de unidades disponibles en el sistema."
    >
      <UnitTypesTable
        apiEndpoint="/api/unit-types"
        detailBasePath="/collaborator/dashboard/unit-types"
        readOnly={true}
      />
    </ResourceListPage>
  );
}
