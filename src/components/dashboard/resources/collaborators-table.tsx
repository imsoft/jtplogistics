"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import type { Employee } from "@/types/resources.types";

function getColumns(): ColumnDef<Employee>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.email} ${row.position ?? ""} ${row.department ?? ""}`,
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
    {
      accessorKey: "position",
      header: ({ column }) => <SortableColumnHeader column={column} title="Puesto" />,
      cell: ({ row }) => row.getValue("position") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "department",
      header: ({ column }) => <SortableColumnHeader column={column} title="Departamento" />,
      cell: ({ row }) => row.getValue("department") ?? <span className="text-muted-foreground">—</span>,
    },
  ];
}

export function CollaboratorsTable() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: collaborators, isLoaded, error } = useAdminFetch<Employee>(
    "/api/collaborators",
    "Error al cargar colaboradores"
  );
  const [filterDepartment, setFilterDepartment] = useState("all");

  const departments = useMemo(
    () => Array.from(new Set(collaborators.map((e) => e.department).filter(Boolean) as string[])).sort(),
    [collaborators]
  );

  const filtered = useMemo(() => collaborators.filter((e) => {
    if (filterDepartment !== "all" && e.department !== filterDepartment) return false;
    return true;
  }), [collaborators, filterDepartment]);

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (collaborators.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay colaboradores registrados.
      </p>
    );
  }

  return (
    <DataTable<Employee, unknown>
      columns={getColumns()}
      data={filtered}
      filterColumn="search"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`${pathname}/${row.id}/edit`)}
      toolbar={
        <>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los depto.</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilterDepartment("all")}
          >
            Limpiar filtros
          </Button>
        </>
      }
    />
  );
}
