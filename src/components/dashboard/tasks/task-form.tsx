"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS_OPTIONS } from "@/lib/constants/task-status";
import type { TaskFormData, TaskStatus } from "@/types/task.types";

interface Developer {
  id: string;
  name: string;
}

interface TaskFormProps {
  initialValues?: Partial<TaskFormData>;
  developers: Developer[];
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: TaskFormData) => void;
  isSubmitting?: boolean;
}

export function TaskForm({
  initialValues = {},
  developers,
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: TaskFormProps) {
  const [status, setStatus] = useState<TaskStatus>(initialValues.status ?? "pending");
  const [assigneeId, setAssigneeId] = useState<string>(initialValues.assigneeId ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const description = (formData.get("description") as string)?.trim() ?? "";
    onSubmit({
      title: description.slice(0, 80) || "—",
      description,
      status,
      assigneeId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-description">Descripción</Label>
          <Textarea
            id="task-description"
            name="description"
            rows={4}
            required
            className="resize-none"
            disabled={isSubmitting}
            defaultValue={initialValues.description ?? ""}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Desarrollador asignado</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId} required disabled={isSubmitting}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar desarrollador…" />
              </SelectTrigger>
              <SelectContent>
                {developers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)} disabled={isSubmitting}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto" disabled={isSubmitting}>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !assigneeId}>
          {isSubmitting ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
