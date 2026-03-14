"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Laptop } from "@/types/resources.types";

function getColumns(): ColumnDef<Laptop>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.serialNumber ?? ""} ${row.assignedTo?.name ?? ""} ${row.emailAccount?.email ?? ""}`.toLowerCase(),
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

export function LaptopsTable() {
  const router = useRouter();
  const { data: laptops, isLoaded, error } = useAdminFetch<Laptop>(
    "/api/admin/laptops",
    "Error al cargar laptops"
  );
  const [filterAssigned, setFilterAssigned] = useState("all");

  const filtered = useMemo(() => laptops.filter((l) => {
    if (filterAssigned === "yes" && !l.assignedToId) return false;
    if (filterAssigned === "no" && l.assignedToId) return false;
    return true;
  }), [laptops, filterAssigned]);

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (laptops.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay laptops registradas.
      </p>
    );
  }

  return (
    <DataTable<Laptop, unknown>
      columns={getColumns()}
      data={filtered}
      filterColumn="search"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(laptop) => router.push(`/admin/dashboard/laptops/${laptop.id}`)}
      toolbar={
        <>
          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquier asignación</SelectItem>
              <SelectItem value="yes">Asignado</SelectItem>
              <SelectItem value="no">Sin asignar</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilterAssigned("all")}
          >
            Limpiar filtros
          </Button>
        </>
      }
    />
  );
}
