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
import type { EmailAccount } from "@/types/resources.types";

const EMAIL_TYPES = ["Gmail", "Outlook", "iCloud", "Yahoo", "Corporativo", "Otro"];

function getColumns(): ColumnDef<EmailAccount>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.email} ${row.type} ${row.assignees.map((a) => a.name).join(" ")}`.toLowerCase(),
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("email")}</span>,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => row.getValue("type"),
    },
    {
      id: "assignees",
      header: ({ column }) => <SortableColumnHeader column={column} title="Asignados" />,
      accessorFn: (row) => row.assignees.map((a) => a.name).join(", "),
      cell: ({ row }) => {
        const names = row.original.assignees.map((a) => a.name).join(", ");
        return names || <span className="text-muted-foreground">Sin asignar</span>;
      },
    },
  ];
}

export function EmailsTable() {
  const router = useRouter();
  const { data: emails, isLoaded, error } = useAdminFetch<EmailAccount>(
    "/api/admin/emails",
    "Error al cargar correos"
  );
  const [filterType, setFilterType] = useState("all");

  const filtered = useMemo(() => emails.filter((e) => {
    if (filterType !== "all" && e.type !== filterType) return false;
    return true;
  }), [emails, filterType]);

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (emails.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay correos registrados.
      </p>
    );
  }

  return (
    <DataTable<EmailAccount, unknown>
      columns={getColumns()}
      data={filtered}
      filterColumn="search"
      filterPlaceholder="Buscar por correo, tipo, asignado…"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(email) => router.push(`/admin/dashboard/emails/${email.id}`)}
      toolbar={
        <>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {EMAIL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilterType("all")}
          >
            Limpiar filtros
          </Button>
        </>
      }
    />
  );
}
