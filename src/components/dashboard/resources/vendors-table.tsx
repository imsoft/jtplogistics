"use client";

import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import type { Vendor } from "@/types/resources.types";

function getColumns(): ColumnDef<Vendor>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.email}`,
      filterFn: "fuzzy",
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
      accessorKey: "email",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
    },
  ];
}

export function VendorsTable() {
  const router = useRouter();
  const { data: vendors, isLoaded, error } = useAdminFetch<Vendor>(
    "/api/admin/vendors",
    "Error al cargar vendedores"
  );

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (vendors.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay vendedores registrados.
      </p>
    );
  }

  return (
    <DataTable<Vendor, unknown>
      columns={getColumns()}
      data={vendors}
      filterColumn="search"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(v) => router.push(`/admin/dashboard/vendors/${v.id}`)}
    />
  );
}
