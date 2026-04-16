"use client";

import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskStatus } from "@/types/task.types";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string;
  assigneeName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
};

const STATUS_VARIANT: Record<TaskStatus, "default" | "secondary" | "outline"> = {
  pending: "outline",
  in_progress: "default",
  completed: "secondary",
};

export default function CollaboratorTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/tasks")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar tareas");
        return r.json();
      })
      .then((data: Task[]) => {
        setTasks(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Tareas</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Lista de tareas asignadas al equipo de desarrollo.
        </p>
      </div>
      <Separator />
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : tasks.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay tareas registradas.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{task.title}</p>
                    {task.description && (
                      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                      <span>Asignado a: <span className="text-foreground">{task.assigneeName}</span></span>
                      <span>Creado por: <span className="text-foreground">{task.createdByName}</span></span>
                      <span>{new Date(task.createdAt).toLocaleDateString("es-MX", {
                        year: "numeric", month: "short", day: "numeric",
                      })}</span>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[task.status]} className="shrink-0 self-start">
                    {STATUS_LABELS[task.status]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
