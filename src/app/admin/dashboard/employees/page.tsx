import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { EmployeesTable } from "@/components/dashboard/resources/employees-table";

export const metadata = {
  title: "Empleados | JTP Logistics",
  description: "Gestionar colaboradores de la empresa",
};

export default function EmployeesPage() {
  return (
    <ResourceListPage
      title="Empleados"
      description="Colaboradores registrados en el sistema."
      newHref="/admin/dashboard/employees/new"
      newLabel="Nuevo empleado"
    >
      <EmployeesTable />
    </ResourceListPage>
  );
}
