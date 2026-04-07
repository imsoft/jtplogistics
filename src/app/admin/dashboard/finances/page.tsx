import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { FinancesTable } from "@/components/dashboard/resources/finances-table";

export const metadata = {
  title: "Tabla de finanzas | JTP Logistics",
  description: "Gestionar registros de finanzas de la empresa",
};

export default function FinancesPage() {
  return (
    <ResourceListPage
      title="Tabla de finanzas"
      description="Registros de finanzas generados automáticamente cuando un embarque se cierra."
    >
      <FinancesTable />
    </ResourceListPage>
  );
}
