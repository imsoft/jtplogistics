import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { EmployeesTable } from "@/components/dashboard/resources/employees-table";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Colaboradores | JTP Logistics",
  description: "Gestionar colaboradores de la empresa",
};

// El conteo se lee en cada visita: si alguien da de alta a otro, no se queda viejo.
export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  // El mismo filtro que usa la tabla, para que el número cuadre con los renglones.
  const count = await prisma.user.count({ where: { role: "collaborator" } });

  return (
    <ResourceListPage
      title="Colaboradores"
      count={count}
      description="Colaboradores registrados en el sistema."
      newHref="/admin/dashboard/employees/new"
      newLabel="Nuevo colaborador"
    >
      <EmployeesTable />
    </ResourceListPage>
  );
}
