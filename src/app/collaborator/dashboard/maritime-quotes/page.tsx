import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { MaritimeQuotesTable } from "@/components/dashboard/quotes/maritime-quotes-table";

export const metadata = {
  title: "Cotización Marítima | JTP Logistics",
  description: "Gestionar cotizaciones marítimas",
};

export default function CollaboratorMaritimeQuotesPage() {
  return (
    <ResourceListPage
      title="Cotización marítima"
      description="Cotizaciones marítimas registradas."
      newHref="/collaborator/dashboard/maritime-quotes/new"
      newLabel="Nueva cotización"
    >
      <MaritimeQuotesTable
        apiEndpoint="/api/admin/maritime-quotes"
        detailBasePath="/collaborator/dashboard/maritime-quotes"
      />
    </ResourceListPage>
  );
}
