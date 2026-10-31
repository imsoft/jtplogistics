"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/ui/app-select";
import { TASK_STATUS_OPTIONS } from "@/lib/constants/task-status";
import type { TaskFormData, TaskStatus } from "@/types/task.types";
import { ActionBar } from "@/components/ui/form-actions";
import { FormSection, RequiredText } from "@/components/ui/form-section";
import { ListTodo } from "lucide-react";

interface TaskFormProps {
  initialValues?: Partial<TaskFormData>;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (data: TaskFormData) => void;
  isSubmitting?: boolean;
}

export function TaskForm({
  initialValues = {},
  submitLabel,
  cancelHref,
  onSubmit,
  isSubmitting = false,
}: TaskFormProps) {
  const [status, setStatus] = useState<TaskStatus>(initialValues.status ?? "pending");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const description = (formData.get("description") as string)?.trim() ?? "";
    onSubmit({
      title: description.slice(0, 80) || "—",
      description,
      status,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      <FormSection icon={ListTodo} title="Tarea" description="Qué hay que hacer y en qué va." className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-description">
            <RequiredText>Descripción</RequiredText>
          </Label>
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

        <div className="space-y-2 max-w-xs">
          <Label>Estado</Label>
          <AppSelect
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus)}
            options={TASK_STATUS_OPTIONS}
            disabled={isSubmitting}
            className="w-full"
          />
        </div>
      </FormSection>

      <ActionBar sticky>
        <Button type="button" variant="outline" asChild className="w-full sm:w-auto" disabled={isSubmitting}>
          <Link href={cancelHref}>Cancelar</Link>
        </Button>
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : submitLabel}
        </Button>
      </ActionBar>
    </form>
  );
}
