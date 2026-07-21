import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { EmployeesTable } from "@/components/dashboard/resources/employees-table";

export const metadata = {
  title: "Colaboradores | JTP Logistics",
  description: "Gestionar colaboradores",
};

export default function CollaboratorEmployeesPage() {
  return (
    <ResourceListPage
      title="Colaboradores"
      description="Equipo de colaboradores de la empresa."
      newHref="/collaborator/dashboard/employees/new"
      newLabel="Nuevo colaborador"
    >
      <EmployeesTable
        apiEndpoint="/api/collaborator/employees"
        detailBasePath="/collaborator/dashboard/employees"
      />
    </ResourceListPage>
  );
}
