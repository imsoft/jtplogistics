"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { type ColumnDef } from "@tanstack/react-table";
import type { Vendor } from "@/types/resources.types";

function getColumns(): ColumnDef<Vendor>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.position ?? ""} ${row.email}`,
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
      accessorKey: "position",
      header: ({ column }) => <SortableColumnHeader column={column} title="Puesto" />,
      cell: ({ row }) => row.getValue("position") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
    },
  ];
}

export default function CollaboratorVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/vendors")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar vendedores");
        return r.json();
      })
      .then((data: Vendor[]) => {
        setVendors(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">Vendedores</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Vendedores registrados en el sistema.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
          <Link href="/collaborator/dashboard/vendors/new">
            <Plus className="size-4" />
            Nuevo vendedor
          </Link>
        </Button>
      </div>
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : vendors.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay vendedores registrados.
        </p>
      ) : (
        <DataTable<Vendor, unknown>
          columns={getColumns()}
          data={vendors}
          filterColumn="search"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
          onRowClick={(v) => router.push(`/collaborator/dashboard/vendors/${v.id}`)}
        />
      )}
    </div>
  );
}
