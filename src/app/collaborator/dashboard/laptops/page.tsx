"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ColumnDef } from "@tanstack/react-table";
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

export default function CollaboratorLaptopsPage() {
  const router = useRouter();
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAssigned, setFilterAssigned] = useState("all");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/laptops")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar laptops");
        return r.json();
      })
      .then((data: Laptop[]) => {
        setLaptops(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  const filtered = useMemo(() => laptops.filter((l) => {
    if (filterAssigned === "yes" && !l.assignedToId) return false;
    if (filterAssigned === "no" && l.assignedToId) return false;
    return true;
  }), [laptops, filterAssigned]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">Laptops</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Laptops registradas y su asignación.
          </p>
        </div>
      </div>
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : laptops.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay laptops registradas.
        </p>
      ) : (
        <DataTable<Laptop, unknown>
          columns={getColumns()}
          data={filtered}
          filterColumn="search"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
          onRowClick={(laptop) => router.push(`/collaborator/dashboard/laptops/${laptop.id}`)}
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
      )}
    </div>
  );
}
