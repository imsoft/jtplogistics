import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { PhonesTable } from "@/components/dashboard/resources/phones-table";

export const metadata = {
  title: "Celulares | JTP Logistics",
  description: "Gestionar dispositivos móviles",
};

export default function CollaboratorPhonesPage() {
  return (
    <ResourceListPage
      title="Celulares"
      description="Dispositivos móviles de la empresa."
      newHref="/collaborator/dashboard/phones/new"
      newLabel="Nuevo celular"
    >
      <PhonesTable
        apiEndpoint="/api/collaborator/phones"
        detailBasePath="/collaborator/dashboard/phones"
      />
    </ResourceListPage>
  );
}
