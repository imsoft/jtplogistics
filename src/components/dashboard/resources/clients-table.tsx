"use client";

import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import type { Client } from "@/types/client.types";

function getColumns(): ColumnDef<Client>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.name} ${row.legalName ?? ""} ${row.email ?? ""} ${row.phone ?? ""} ${row.rfc ?? ""}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "legalName",
      header: ({ column }) => <SortableColumnHeader column={column} title="Razón social" />,
      cell: ({ row }) => row.getValue("legalName") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => row.getValue("email") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <SortableColumnHeader column={column} title="Teléfono" />,
      cell: ({ row }) => row.getValue("phone") ?? <span className="text-muted-foreground">—</span>,
    },
  ];
}

export function ClientsTable() {
  const router = useRouter();
  const { data: clients, isLoaded, error } = useAdminFetch<Client>(
    "/api/admin/clients",
    "Error al cargar clientes"
  );

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (clients.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay clientes registrados.
      </p>
    );
  }

  return (
    <DataTable<Client, unknown>
      columns={getColumns()}
      data={clients}
      filterColumn="search"
      filterPlaceholder="Buscar por nombre, razón social, correo, teléfono…"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(client) => router.push(`/admin/dashboard/clients/${client.id}`)}
    />
  );
}
