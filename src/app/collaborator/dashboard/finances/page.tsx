import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { FinancesTable } from "@/components/dashboard/resources/finances-table";

export const metadata = {
  title: "Finanzas | JTP Logistics",
  description: "Gestionar finanzas",
};

export default function CollaboratorFinancesPage() {
  return (
    <ResourceListPage
      title="Finanzas"
      description="Estado financiero de embarques."
    >
      <FinancesTable
        apiEndpoint="/api/collaborator/finances"
        detailBasePath="/collaborator/dashboard/finances"
      />
    </ResourceListPage>
  );
}
