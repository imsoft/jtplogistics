"use client";

import { useMemo, useState, useCallback } from "react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUS_OPTIONS, TASK_STATUS_LABELS } from "@/lib/constants/task-status";
import { getTasksColumns } from "./tasks-columns";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types/task.types";

const ALL = "all";

const STATUS_BADGE: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export function DeveloperTasksTable() {
  const { data: tasks, isLoaded, error } = useAdminFetch<Task>(
    "/api/developer/tasks",
    "Error al cargar tareas"
  );
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | typeof ALL>(ALL);

  const baseTasks = localTasks ?? tasks;
  const displayTasks = useMemo(
    () => filterStatus === ALL ? baseTasks : baseTasks.filter((t) => t.status === filterStatus),
    [baseTasks, filterStatus]
  );

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/developer/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const updated: Task = await res.json();
      setLocalTasks((prev) =>
        (prev ?? tasks).map((t) => (t.id === updated.id ? updated : t))
      );
      toast.success("Estado actualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el estado.");
    }
  }, [tasks]);

  const columns = useMemo(
    () => [
      ...getTasksColumns({ adminView: false }),
      {
        id: "change_status",
        header: "Cambiar estado",
        cell: ({ row }: { row: { original: Task } }) => {
          const task = row.original;
          return (
            <Select
              value={task.status}
              onValueChange={(v) => handleStatusChange(task.id, v as TaskStatus)}
            >
              <SelectTrigger className="w-[160px] [&_[data-slot=select-value]]:hidden">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[task.status]}`}>
                  {TASK_STATUS_LABELS[task.status]}
                </span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="w-44">
                {TASK_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
        enableSorting: false,
      },
    ],
    [handleStatusChange]
  );

  if (!isLoaded) return <p className="text-muted-foreground text-sm">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  return (
    <DataTable
      columns={columns}
      data={displayTasks}
      filterColumn="search"
      filterPlaceholder="Buscar por descripción…"
      getRowId={(row) => row.id}
      toolbar={
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TaskStatus | typeof ALL)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los estados</SelectItem>
            {TASK_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {TASK_STATUS_LABELS[opt.value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );
}
