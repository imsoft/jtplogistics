"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskForm } from "@/components/dashboard/tasks/task-form";
import { toast } from "sonner";
import type { TaskFormData } from "@/types/task.types";

export default function NewTaskPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: TaskFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al crear la tarea.");
      }
      toast.success("Tarea creada correctamente.");
      router.push("/admin/dashboard/tasks");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear la tarea.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/admin/dashboard/tasks" aria-label="Volver a tareas">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-heading">Nueva tarea</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Crea una nueva tarea para el desarrollador.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base sm:text-lg">Datos de la tarea</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Describe la tarea y selecciona el estado inicial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            submitLabel="Crear tarea"
            cancelHref="/admin/dashboard/tasks"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
