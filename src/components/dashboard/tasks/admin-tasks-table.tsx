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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getTasksColumns } from "./tasks-columns";
import { TASK_STATUS_LABELS, TASK_STATUS_OPTIONS } from "@/lib/constants/task-status";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/types/task.types";

const ALL = "all";

export function AdminTasksTable() {
  const { data: tasks, isLoaded, error } = useAdminFetch<Task>(
    "/api/admin/tasks",
    "Error al cargar tareas"
  );
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | typeof ALL>(ALL);

  const baseTasks = localTasks ?? tasks;
  const displayTasks = useMemo(
    () => filterStatus === ALL ? baseTasks : baseTasks.filter((t) => t.status === filterStatus),
    [baseTasks, filterStatus]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTask) return;
    try {
      const res = await fetch(`/api/admin/tasks/${deleteTask.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setLocalTasks((prev) => (prev ?? tasks).filter((t) => t.id !== deleteTask.id));
      toast.success("Tarea eliminada.");
    } catch {
      toast.error("No se pudo eliminar la tarea.");
    } finally {
      setDeleteTask(null);
    }
  }, [deleteTask, tasks]);

  const columns = useMemo(
    () => getTasksColumns({ adminView: true, onDelete: (t) => setDeleteTask(t) }),
    []
  );

  if (!isLoaded) return <p className="text-muted-foreground text-sm">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  return (
    <>
      <DataTable
        columns={columns}
        data={displayTasks}
        filterColumn="search"
        getRowId={(row) => row.id}
        toolbar={
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TaskStatus | typeof ALL)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
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
      <AlertDialog open={deleteTask !== null} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTask?.description
                ? `Se eliminará la tarea: "${deleteTask.description.slice(0, 60)}${deleteTask.description.length > 60 ? "…" : ""}". `
                : "Se eliminará esta tarea. "}
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
