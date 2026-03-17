import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AdminTasksTable } from "@/components/dashboard/tasks/admin-tasks-table";

export const metadata: Metadata = {
  title: "Tareas | JTP Logistics",
  description: "Gestionar tareas para el equipo de desarrollo",
};

export default function AdminTasksPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Tareas</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Lista de tareas asignadas al equipo de desarrollo.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/dashboard/tasks/new">
            <Plus className="size-4" />
            Nueva tarea
          </Link>
        </Button>
      </div>
      <Separator />
      <AdminTasksTable />
    </div>
  );
}
