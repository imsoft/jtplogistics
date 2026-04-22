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
import type { PhoneDevice } from "@/types/resources.types";
import { formatPhone, formatIMEI } from "@/lib/utils";

function getColumns(): ColumnDef<PhoneDevice>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.phoneNumber ?? ""} ${row.imei ?? ""} ${row.assignedTo?.name ?? ""} ${row.emailAccount?.email ?? ""}`,
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
      accessorKey: "phoneNumber",
      header: ({ column }) => <SortableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("phoneNumber");
        return v ? formatPhone(v) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "imei",
      header: ({ column }) => <SortableColumnHeader column={column} title="IMEI" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("imei");
        return v ? formatIMEI(v) : <span className="text-muted-foreground">—</span>;
      },
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

export function PhonesTable() {
  const router = useRouter();
  const { data: phones, isLoaded, error } = useAdminFetch<PhoneDevice>(
    "/api/admin/phones",
    "Error al cargar celulares"
  );
  const [filterAssigned, setFilterAssigned] = useState("all");

  const filtered = useMemo(() => phones.filter((p) => {
    if (filterAssigned === "yes" && !p.assignedToId) return false;
    if (filterAssigned === "no" && p.assignedToId) return false;
    return true;
  }), [phones, filterAssigned]);

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (phones.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay celulares registrados.
      </p>
    );
  }

  return (
    <DataTable<PhoneDevice, unknown>
      columns={getColumns()}
      data={filtered}
      filterColumn="search"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(phone) => router.push(`/admin/dashboard/phones/${phone.id}`)}
      toolbar={
        <>
          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
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
