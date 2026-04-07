import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { FinancesTable } from "@/components/dashboard/resources/finances-table";

export const metadata = {
  title: "Tabla de finanzas | JTP Logistics",
  description: "Consulta de embarques con estado y tarifas (solo lectura)",
};

export default function FinancesPage() {
  return (
    <ResourceListPage
      title="Tabla de finanzas"
      description="Todos los embarques con su estado. Las tarifas de venta y compra aparecen cuando existe registro financiero vinculado al embarque. Solo consulta: edita en la tabla de embarques."
    >
      <FinancesTable />
    </ResourceListPage>
  );
}
