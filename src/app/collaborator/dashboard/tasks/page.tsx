import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";
import { TasksTable } from "@/components/dashboard/tasks/tasks-table";

export const metadata = {
  title: "Tareas | JTP Logistics",
  description: "Gestionar tareas",
};

export default function CollaboratorTasksPage() {
  return (
    <ResourceListPage
      title="Tareas"
      description="Tareas pendientes y completadas."
      newHref="/collaborator/dashboard/tasks/new"
      newLabel="Nueva tarea"
    >
      <TasksTable
        apiEndpoint="/api/admin/tasks"
        detailBasePath="/collaborator/dashboard/tasks"
      />
    </ResourceListPage>
  );
}
