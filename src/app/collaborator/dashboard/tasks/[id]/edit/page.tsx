"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSkeleton } from "@/components/ui/skeletons";
import { TaskForm } from "@/components/dashboard/tasks/task-form";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { toast } from "sonner";
import type { Task, TaskFormData } from "@/types/task.types";

export default function EditCollaboratorTaskPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { permissions, isLoaded: permissionsLoaded } = useCollaboratorPermissions();
  const [task, setTask] = useState<Task | null>(null);
  const [loadedTask, setLoadedTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (permissionsLoaded && !permissions?.canUpdateTasks && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/tasks");
    }
  }, [permissionsLoaded, permissions, router]);

  useEffect(() => {
    if (!permissionsLoaded || !permissions?.canUpdateTasks) return;
    fetch("/api/collaborator/tasks")
      .then((r) => (r.ok ? r.json() : []))
      .then((tasks) => {
        const found = Array.isArray(tasks) ? tasks.find((t: Task) => t.id === id) : null;
        setTask(found ?? null);
        setLoadedTask(true);
      });
  }, [permissionsLoaded, permissions, id]);

  async function handleSubmit(data: TaskFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/collaborator/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar la tarea.");
      }
      toast.success("Tarea guardada correctamente.");
      router.push("/collaborator/dashboard/tasks");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar la tarea.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!permissionsLoaded || (permissions?.canUpdateTasks && !loadedTask)) {
    return <FormSkeleton />;
  }
  if (!permissions?.canUpdateTasks) return null;
  if (!task) return <p className="text-sm text-destructive">No se encontró la tarea.</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/collaborator/dashboard/tasks" aria-label="Volver a tareas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Editar tarea</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">
            {task.description ? task.description.slice(0, 80) : "Sin descripción"}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Datos de la tarea</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Modifica la descripción o el estado de la tarea.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            initialValues={{
              title: task.title,
              description: task.description ?? "",
              status: task.status,
            }}
            submitLabel="Guardar cambios"
            cancelHref="/collaborator/dashboard/tasks"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
