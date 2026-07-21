"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { DataTable } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";

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

function getColumns(): ColumnDef<Route>[] {
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
        <span className="font-medium">{row.original.origin} → {row.original.destination}</span>
      ),
    },
    {
      accessorKey: "unitType",
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipo de unidad" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("unitType")}</span>,
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
  const { permissions, isLoaded: permissionsLoaded } = useCollaboratorPermissions();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (permissionsLoaded && !permissions?.canViewRoutes && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [permissionsLoaded, permissions, router]);

  useEffect(() => {
    if (!permissionsLoaded || !permissions?.canViewRoutes) return;
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
  }, [permissionsLoaded, permissions]);

  function handleRowClick(route: Route) {
    router.push(`/collaborator/dashboard/routes/${route.id}`);
  }

  if (!permissionsLoaded) {
    return (
      <div className="min-w-0 space-y-4 sm:space-y-6">
        <div className="min-w-0">
          <h1 className="page-heading">Rutas</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Rutas de entrega registradas en el sistema.
          </p>
        </div>
        <Separator />
        <DataTableSkeleton />
      </div>
    );
  }

  if (!permissions?.canViewRoutes) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading flex items-center gap-2">
            Rutas
            {isLoaded && <span className="text-sm font-normal text-muted-foreground">({routes.length})</span>}
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Rutas de entrega registradas en el sistema.
          </p>
        </div>
      </div>
      <Separator />
      {!isLoaded ? (
        <DataTableSkeleton />
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : routes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay rutas registradas.
        </p>
      ) : (
        <DataTable<Route, unknown>
          columns={getColumns()}
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
