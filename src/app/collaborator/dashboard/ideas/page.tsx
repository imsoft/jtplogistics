import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { IdeasTable } from "@/components/dashboard/ideas/ideas-table";

export const metadata = {
  title: "Ideas | JTP Logistics",
  description: "Gestionar ideas",
};

export default function CollaboratorIdeasPage() {
  return (
    <ResourceListPage
      title="Ideas"
      description="Banco de ideas de la empresa."
      newHref="/collaborator/dashboard/ideas/new"
      newLabel="Nueva idea"
    >
      <IdeasTable
        apiEndpoint="/api/admin/ideas"
        detailBasePath="/collaborator/dashboard/ideas"
      />
    </ResourceListPage>
  );
}
