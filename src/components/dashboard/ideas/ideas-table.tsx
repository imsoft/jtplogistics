"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { DataTable } from "@/components/ui/data-table";
import { IDEA_CATEGORY_COLORS, IDEA_STATUS_COLORS, IDEA_STATUS_LABELS } from "@/lib/constants/idea-category";
import type { Idea } from "@/types/idea.types";

interface IdeasTableProps {
  isAdmin: boolean;
}

export function IdeasTable({ isAdmin }: IdeasTableProps) {
  const router = useRouter();
  const { data: ideas, isLoaded, error } = useAdminFetch<Idea>(
    "/api/ideas",
    "Error al cargar ideas"
  );

  const columns = useMemo<ColumnDef<Idea>[]>(() => [
    {
      accessorKey: "title",
      header: "Título",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Categoría",
      cell: ({ row }) => {
        const cat = row.original.category;
        if (!cat) return <span className="text-muted-foreground text-sm">—</span>;
        const color = IDEA_CATEGORY_COLORS[cat] ?? "bg-secondary text-secondary-foreground";
        return (
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
            {cat}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.original.status ?? "pending";
        const color = IDEA_STATUS_COLORS[status] ?? "bg-secondary text-secondary-foreground";
        return (
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
            {IDEA_STATUS_LABELS[status] ?? status}
          </span>
        );
      },
    },
    {
      accessorKey: "authorName",
      header: "Autor",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.authorName}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
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
  ], []);

  if (!isLoaded) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (error) {
    return (
      <p className="text-destructive rounded-lg border border-dashed p-4 text-center text-sm">
        {error}
      </p>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={ideas}
      filterColumn="title"
      onRowClick={
        isAdmin
          ? (idea) => router.push(`/admin/dashboard/ideas/${idea.id}`)
          : undefined
      }
    />
  );
}
