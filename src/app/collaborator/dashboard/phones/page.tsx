"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
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
import { formatPhone } from "@/lib/utils";
import type { PhoneDevice } from "@/types/resources.types";

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
      id: "assignedTo",
      header: ({ column }) => <SortableColumnHeader column={column} title="Asignado a" />,
      accessorFn: (row) => row.assignedTo?.name ?? "",
      cell: ({ row }) => {
        const name = row.original.assignedTo?.name;
        return name ? <span>{name}</span> : <span className="text-muted-foreground">Sin asignar</span>;
      },
    },
  ];
}

export default function CollaboratorPhonesPage() {
  const router = useRouter();
  const [phones, setPhones] = useState<PhoneDevice[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAssigned, setFilterAssigned] = useState("all");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/phones")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar celulares");
        return r.json();
      })
      .then((data: PhoneDevice[]) => {
        setPhones(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  const filtered = useMemo(() => phones.filter((p) => {
    if (filterAssigned === "yes" && !p.assignedToId) return false;
    if (filterAssigned === "no" && p.assignedToId) return false;
    return true;
  }), [phones, filterAssigned]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">Celulares</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Celulares registrados y su asignación.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
          <Link href="/collaborator/dashboard/phones/new">
            <Plus className="size-4" />
            Nuevo celular
          </Link>
        </Button>
      </div>
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : phones.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay celulares registrados.
        </p>
      ) : (
        <DataTable<PhoneDevice, unknown>
          columns={getColumns()}
          data={filtered}
          filterColumn="search"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
          onRowClick={(phone) => router.push(`/collaborator/dashboard/phones/${phone.id}`)}
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
