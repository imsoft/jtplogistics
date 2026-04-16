"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { type ColumnDef } from "@tanstack/react-table";

interface Route {
  id: string;
  origin: string;
  destination: string;
  unitType: string;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  inactive: "Inactiva",
  pending: "Pendiente",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
};

function getColumns(onRowClick: (r: Route) => void): ColumnDef<Route>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.origin} ${row.destination} ${row.unitType}`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "route",
      header: ({ column }) => <SortableColumnHeader column={column} title="Ruta" />,
      accessorFn: (row) => `${row.origin} → ${row.destination}`,
      cell: ({ row }) => (
        <span
          className="font-medium cursor-pointer hover:underline"
          onClick={() => onRowClick(row.original)}
        >
          {row.original.origin} → {row.original.destination}
        </span>
      ),
    },
    {
      accessorKey: "unitType",
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipo de unidad" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("unitType")}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        return (
          <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="text-xs">
            {STATUS_LABELS[status] ?? status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumnHeader column={column} title="Creada" />,
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

export default function CollaboratorRoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/routes")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar rutas");
        return r.json();
      })
      .then((data: Route[]) => {
        setRoutes(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  function handleRowClick(route: Route) {
    router.push(`/collaborator/dashboard/routes/${route.id}`);
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="page-heading">Rutas</h1>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
          Rutas de entrega registradas en el sistema.
        </p>
      </div>
      <Separator />
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : routes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay rutas registradas.
        </p>
      ) : (
        <DataTable<Route, unknown>
          columns={getColumns(handleRowClick)}
          data={routes}
          filterColumn="search"
          filterPlaceholder="Buscar…"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
