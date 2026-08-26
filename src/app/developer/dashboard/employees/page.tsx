import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { EmployeesTable } from "@/components/dashboard/resources/employees-table";
import { requireDeveloperPage } from "@/lib/auth-server";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Colaboradores | JTP Logistics",
  description: "Directorio de colaboradores para soporte de TI",
};

// El conteo se lee en cada visita para que no se quede viejo.
export const dynamic = "force-dynamic";

export default async function DeveloperEmployeesPage() {
  await requireDeveloperPage();
  const count = await prisma.user.count({ where: { role: "collaborator" } });

  return (
    <ResourceListPage
      title="Colaboradores"
      count={count}
      description="Ficha completa de cada colaborador y su equipo asignado."
    >
      <EmployeesTable
        apiEndpoint="/api/developer/employees"
        detailBasePath="/developer/dashboard/employees"
      />
    </ResourceListPage>
  );
}
