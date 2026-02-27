import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { IdeasTable } from "@/components/dashboard/ideas/ideas-table";

export default function IdeasPage() {
  return (
    <ResourceListPage
      title="Ideas"
      description="Sugerencias e ideas del equipo."
      newHref="/admin/dashboard/ideas/new"
      newLabel="Nueva idea"
    >
      <IdeasTable isAdmin />
    </ResourceListPage>
  );
}
