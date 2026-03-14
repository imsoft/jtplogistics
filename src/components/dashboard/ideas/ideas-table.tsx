"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { DataTable } from "@/components/ui/data-table";
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
      cell: ({ row }) =>
        row.original.category ? (
          <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs font-medium">
            {row.original.category}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
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
