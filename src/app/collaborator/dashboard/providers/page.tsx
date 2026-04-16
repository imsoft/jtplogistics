"use client";

import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { type ColumnDef } from "@tanstack/react-table";

interface Provider {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
}

function getColumns(): ColumnDef<Provider>[] {
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
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumnHeader column={column} title="Registro" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {new Date(row.getValue("createdAt")).toLocaleDateString("es-MX", {
            year: "numeric", month: "short", day: "numeric",
          })}
        </span>
      ),
    },
  ];
}

export default function CollaboratorProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/providers")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar proveedores");
        return r.json();
      })
      .then((data: Provider[]) => {
        setProviders(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Proveedores</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Transportistas registrados en la plataforma.
        </p>
      </div>
      <Separator />
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : providers.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay proveedores registrados.
        </p>
      ) : (
        <DataTable<Provider, unknown>
          columns={getColumns()}
          data={providers}
          filterColumn="search"
          filterPlaceholder="Buscar…"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
        />
      )}
    </div>
  );
}
