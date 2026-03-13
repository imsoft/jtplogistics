import type { TaskStatus } from "@/types/task.types";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
};

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completada" },
];
