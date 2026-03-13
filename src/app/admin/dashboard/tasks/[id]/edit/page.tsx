"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskForm } from "@/components/dashboard/tasks/task-form";
import { toast } from "sonner";
import type { Task, TaskFormData } from "@/types/task.types";

interface Developer {
  id: string;
  name: string;
}

export default function EditTaskPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/tasks`).then((r) => r.ok ? r.json() : []),
      fetch("/api/admin/users?role=developer").then((r) => r.ok ? r.json() : []),
    ]).then(([tasks, devs]) => {
      const found = Array.isArray(tasks) ? tasks.find((t: Task) => t.id === id) : null;
      setTask(found ?? null);
      if (Array.isArray(devs)) setDevelopers(devs.map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })));
    });
  }, [id]);

  async function handleSubmit(data: TaskFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al guardar la tarea.");
      }
      toast.success("Tarea guardada correctamente.");
      router.push("/admin/dashboard/tasks");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar la tarea.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!task) return <p className="text-muted-foreground text-sm">Cargando…</p>;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/tasks" aria-label="Volver a tareas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Editar tarea</h1>
          <p className="text-muted-foreground truncate text-xs sm:text-sm">{task.title}</p>
        </div>
      </div>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Datos de la tarea</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Modifica el título, descripción, estado o el desarrollador asignado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            initialValues={{
              title: task.title,
              description: task.description ?? "",
              status: task.status,
              assigneeId: task.assigneeId,
            }}
            developers={developers}
            submitLabel="Guardar cambios"
            cancelHref="/admin/dashboard/tasks"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
