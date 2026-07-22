"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { AdminTasksTable } from "@/components/dashboard/tasks/admin-tasks-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorTasksPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewTasks && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  if (!isLoaded) {
    return (
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <div>
          <h1 className="page-heading">Tareas</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Lista de tareas asignadas al equipo de desarrollo.
          </p>
        </div>
        <Separator />
        <DataTableSkeleton />
      </div>
    );
  }

  if (!permissions?.canViewTasks) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-heading">Tareas</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Lista de tareas asignadas al equipo de desarrollo.
          </p>
        </div>
        {permissions.canCreateTasks && (
          <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
            <Link href="/collaborator/dashboard/tasks/new">
              <Plus className="size-4" />
              Nueva tarea
            </Link>
          </Button>
        )}
      </div>
      <Separator />
      <AdminTasksTable
        apiEndpoint="/api/collaborator/tasks"
        editBasePath="/collaborator/dashboard/tasks"
        canEdit={permissions.canUpdateTasks}
        canDelete={permissions.canDeleteTasks}
      />
    </div>
  );
}
