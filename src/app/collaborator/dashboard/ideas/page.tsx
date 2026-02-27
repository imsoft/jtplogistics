import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { IdeasTable } from "@/components/dashboard/ideas/ideas-table";

export default function CollaboratorIdeasPage() {
  return (
    <ResourceListPage
      title="Ideas"
      description="Comparte tus ideas y ve las del equipo."
      newHref="/collaborator/dashboard/ideas/new"
      newLabel="Nueva idea"
    >
      <IdeasTable isAdmin={false} />
    </ResourceListPage>
  );
}
