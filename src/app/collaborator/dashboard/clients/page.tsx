"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type ColumnDef } from "@tanstack/react-table";
import { formatPhone } from "@/lib/utils";
import type { Client } from "@/types/client.types";

function getColumns(): ColumnDef<Client>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.name} ${row.contactName ?? ""} ${row.position ?? ""} ${row.legalName ?? ""} ${row.email ?? ""} ${row.phone ?? ""} ${row.rfc ?? ""} ${(row.productTypes ?? []).join(" ")}`,
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
      accessorKey: "contactName",
      header: ({ column }) => <SortableColumnHeader column={column} title="Nombre de contacto" />,
      cell: ({ row }) => row.getValue("contactName") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "legalName",
      header: ({ column }) => <SortableColumnHeader column={column} title="Razón social" />,
      cell: ({ row }) => row.getValue("legalName") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "productTypes",
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipos de producto" />,
      cell: ({ row }) => {
        const types = row.original.productTypes ?? [];
        if (types.length === 0) return <span className="text-muted-foreground">—</span>;
        const text = types.join(", ");
        const short = text.length > 56 ? `${text.slice(0, 56)}…` : text;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[220px] cursor-default truncate sm:max-w-[280px]">{short}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
              {text}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => row.getValue("email") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <SortableColumnHeader column={column} title="Teléfono" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("phone");
        return v ? formatPhone(v) : <span className="text-muted-foreground">—</span>;
      },
    },
  ];
}

export default function CollaboratorClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/clients")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar clientes");
        return r.json();
      })
      .then((data: Client[]) => {
        setClients(data);
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
          <h1 className="page-heading">Clientes</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Clientes registrados en el sistema.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
          <Link href="/collaborator/dashboard/clients/new">
            <Plus className="size-4" />
            Nuevo cliente
          </Link>
        </Button>
      </div>
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : clients.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay clientes registrados.
        </p>
      ) : (
        <DataTable<Client, unknown>
          columns={getColumns()}
          data={clients}
          filterColumn="search"
          filterPlaceholder="Buscar…"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
          onRowClick={(client) => router.push(`/collaborator/dashboard/clients/${client.id}`)}
        />
      )}
    </div>
  );
}
