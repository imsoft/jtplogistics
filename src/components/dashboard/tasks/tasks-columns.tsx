"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Pencil, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { TASK_STATUS_LABELS } from "@/lib/constants/task-status";
import type { Task } from "@/types/task.types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          aria-label="Copiar descripción"
        >
          {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{copied ? "¡Copiado!" : "Copiar descripción"}</TooltipContent>
    </Tooltip>
  );
}

const STATUS_BADGE: Record<Task["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

interface TasksColumnsOptions {
  onDelete?: (task: Task) => void;
  adminView?: boolean;
}

export function getTasksColumns({ onDelete, adminView = false }: TasksColumnsOptions): ColumnDef<Task>[] {
  const columns: ColumnDef<Task>[] = [
    {
      id: "search",
      accessorFn: (row) => `${row.description ?? ""} ${row.assigneeName}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => {
        const desc = row.original.description;
        if (!desc) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium max-w-[260px] truncate block cursor-default sm:max-w-[360px]">
                  {desc}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                {desc}
              </TooltipContent>
            </Tooltip>
            <CopyButton text={desc} />
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[row.original.status]}`}>
          {TASK_STATUS_LABELS[row.original.status]}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumnHeader column={column} title="Creado" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.createdAt).toLocaleDateString("es-MX", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
  ];

  if (adminView && onDelete) {
    columns.push({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" asChild aria-label="Editar tarea">
              <Link href={`/admin/dashboard/tasks/${task.id}/edit`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(task)}
              aria-label="Eliminar tarea"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    });
  }

  return columns;
}
