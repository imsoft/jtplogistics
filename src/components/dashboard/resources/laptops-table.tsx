"use client";

import { useMemo } from "react";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import type { Laptop } from "@/types/resources.types";

function getColumns(): ColumnDef<Laptop>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.serialNumber ?? ""} ${row.assignedTo?.name ?? ""} ${row.emailAccount?.email ?? ""}`,
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
      accessorKey: "serialNumber",
      header: ({ column }) => <SortableColumnHeader column={column} title="No. de serie" />,
      cell: ({ row }) => row.getValue("serialNumber") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: "assignedTo",
      header: ({ column }) => <SortableColumnHeader column={column} title="Asignado a" />,
      accessorFn: (row) => row.assignedTo?.name ?? "",
      cell: ({ row }) => {
        const name = row.original.assignedTo?.name;
        return name ? <span>{name}</span> : <span className="text-muted-foreground">Sin asignar</span>;
      },
    },
    {
      id: "emailAccount",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      accessorFn: (row) => row.emailAccount?.email ?? "",
      cell: ({ row }) => {
        const email = row.original.emailAccount?.email;
        return email ? <span className="text-xs">{email}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
  ];
}

interface LaptopsTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
}

export function LaptopsTable({
  apiEndpoint = "/api/admin/laptops",
  detailBasePath = "/admin/dashboard/laptops",
}: LaptopsTableProps = {}) {
  const router = useRouter();
  const { data: laptops, isLoaded, error } = useAdminFetch<Laptop>(
    apiEndpoint,
    "Error al cargar laptops"
  );

  const assigned = useMemo(() => laptops.filter((l) => l.assignedToId), [laptops]);
  const unassigned = useMemo(() => laptops.filter((l) => !l.assignedToId), [laptops]);

  const columns = useMemo(() => getColumns(), []);

  if (!isLoaded) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (laptops.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay laptops registradas.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Asignadas</h2>
          <p className="text-xs text-muted-foreground">{assigned.length} laptop{assigned.length !== 1 ? "s" : ""}</p>
        </div>
        {assigned.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No hay laptops asignadas.
          </p>
        ) : (
          <DataTable<Laptop, unknown>
            columns={columns}
            data={assigned}
            filterColumn="search"
            initialColumnVisibility={{ search: false }}
            getRowId={(row) => row.id}
            onRowClick={(laptop) => router.push(`${detailBasePath}/${laptop.id}`)}
          />
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Sin asignar</h2>
          <p className="text-xs text-muted-foreground">{unassigned.length} laptop{unassigned.length !== 1 ? "s" : ""} disponible{unassigned.length !== 1 ? "s" : ""}</p>
        </div>
        {unassigned.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Todas las laptops están asignadas.
          </p>
        ) : (
          <DataTable<Laptop, unknown>
            columns={columns}
            data={unassigned}
            filterColumn="search"
            initialColumnVisibility={{ search: false }}
            getRowId={(row) => row.id}
            onRowClick={(laptop) => router.push(`${detailBasePath}/${laptop.id}`)}
          />
        )}
      </div>
    </div>
  );
}
