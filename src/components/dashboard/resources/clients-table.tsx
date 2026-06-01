"use client";

import { useRouter } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useServerTable } from "@/hooks/use-server-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Client } from "@/types/client.types";
import { formatPhone } from "@/lib/utils";

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
      accessorKey: "position",
      header: ({ column }) => <SortableColumnHeader column={column} title="Puesto" />,
      cell: ({ row }) => row.getValue("position") ?? <span className="text-muted-foreground">—</span>,
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

export function ClientsTable() {
  const router = useRouter();
  const {
    data: clients,
    total,
    pageIndex,
    pageCount,
    setPageIndex,
    sorting,
    setSorting,
    search,
    setSearch,
    isLoading,
    isFetching,
    error,
  } = useServerTable<Client>({
    endpoint: "/api/admin/clients",
    pageSize: 20,
    errorMessage: "Error al cargar clientes",
  });

  if (isLoading) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (total === 0 && search.trim() === "") {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay clientes registrados.
      </p>
    );
  }

  return (
    <DataTable<Client, unknown>
      columns={getColumns()}
      data={clients}
      filterPlaceholder="Buscar…"
      manualPagination
      pageCount={pageCount}
      pageIndex={pageIndex}
      totalCount={total}
      onPageChange={setPageIndex}
      manualSorting
      sorting={sorting}
      onSortingChange={setSorting}
      search={search}
      onSearchChange={setSearch}
      isFetching={isFetching}
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(client) => router.push(`/admin/dashboard/clients/${client.id}`)}
    />
  );
}
