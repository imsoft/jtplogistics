import type { Metadata } from "next";
import { DeveloperTasksTable } from "@/components/dashboard/tasks/developer-tasks-table";

export const metadata: Metadata = {
  title: "Mis tareas | JTP Logistics",
  description: "Lista de tareas asignadas a ti",
};

export default function DeveloperTasksPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-heading">Mis tareas</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Aquí puedes ver y actualizar el estado de las tareas que te han asignado.
        </p>
      </div>
      <DeveloperTasksTable />
    </div>
  );
}
