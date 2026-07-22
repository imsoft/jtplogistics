"use client";

import { useRouter } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useServerTable } from "@/hooks/use-server-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
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
      cell: ({ row }) => <span className="text-muted-foreground text-email">{row.getValue("email")}</span>,
    },
  ];
}

interface VendorsTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
}

export function VendorsTable({
  apiEndpoint = "/api/admin/vendors",
  detailBasePath = "/admin/dashboard/vendors",
}: VendorsTableProps = {}) {
  const router = useRouter();
  const {
    data: vendors,
    total,
    pageIndex,
    pageCount,
    pageSize,
    setPageIndex,
    setPageSize,
    sorting,
    setSorting,
    search,
    setSearch,
    isLoading,
    isFetching,
    error,
  } = useServerTable<Vendor>({
    endpoint: apiEndpoint,
    pageSize: 20,
    errorMessage: "Error al cargar vendedores",
  });

  if (isLoading) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (total === 0 && search.trim() === "") {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay vendedores registrados.
      </p>
    );
  }

  return (
    <DataTable<Vendor, unknown>
      columns={getColumns()}
      data={vendors}
      filterPlaceholder="Buscar…"
      manualPagination
      pageCount={pageCount}
      pageIndex={pageIndex}
      totalCount={total}
      onPageChange={setPageIndex}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      manualSorting
      sorting={sorting}
      onSortingChange={setSorting}
      search={search}
      onSearchChange={setSearch}
      isFetching={isFetching}
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(v) => router.push(`${detailBasePath}/${v.id}`)}
    />
  );
}
