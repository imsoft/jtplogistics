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
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Mis tareas</h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Aquí puedes ver y actualizar el estado de las tareas que te han asignado.
        </p>
      </div>
      <DeveloperTasksTable />
    </div>
  );
}
