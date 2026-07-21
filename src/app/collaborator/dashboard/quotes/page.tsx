import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { QuotesTable } from "@/components/dashboard/quotes/quotes-table";

export const metadata = {
  title: "Cotizador | JTP Logistics",
  description: "Gestionar cotizaciones",
};

export default function CollaboratorQuotesPage() {
  return (
    <ResourceListPage
      title="Cotizador"
      description="Cotizaciones registradas en el sistema."
      newHref="/collaborator/dashboard/quotes/new"
      newLabel="Nueva cotización"
    >
      <QuotesTable
        apiEndpoint="/api/admin/quotes"
        detailBasePath="/collaborator/dashboard/quotes"
      />
    </ResourceListPage>
  );
}
