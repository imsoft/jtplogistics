import { ResourceListPage } from "@/components/dashboard/resources/resource-list-page";

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
      <p className="text-muted-foreground">Sección de tareas.</p>
    </ResourceListPage>
  );
}
