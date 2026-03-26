import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { CollaboratorsTable } from "@/components/dashboard/resources/collaborators-table";

export const metadata = {
  title: "Mis colaboradores | JTP Logistics",
  description: "Gestiona los colaboradores de tu equipo",
};

export default function VendorCollaboratorsPage() {
  return (
    <ResourceListPage
      title="Mis colaboradores"
      description="Colaboradores registrados por tu equipo."
      newHref="/vendor/dashboard/collaborators/new"
      newLabel="Nuevo colaborador"
    >
      <CollaboratorsTable />
    </ResourceListPage>
  );
}
