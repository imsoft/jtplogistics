"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type OnChangeFn,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
}
import { normalizeSearch } from "@/lib/search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterPlaceholder?: string;
  filterColumn?: string;
  initialColumnVisibility?: Record<string, boolean>;
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  getRowClassName?: (row: TData) => string;
  toolbar?: React.ReactNode;

  // --- Modo servidor (opcional). Si se omiten, la tabla opera en modo cliente. ---
  /** Activa paginación controlada por el servidor. */
  manualPagination?: boolean;
  /** Número total de páginas (requerido en modo servidor). */
  pageCount?: number;
  /** Página actual (0-based) en modo servidor. */
  pageIndex?: number;
  /** Total de registros, para mostrar en el pie. */
  totalCount?: number;
  onPageChange?: (index: number) => void;
  /** Orden controlado por el servidor. */
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Búsqueda controlada externamente (server-side). */
  search?: string;
  onSearchChange?: (value: string) => void;
  /** Atenúa la tabla mientras se recarga. */
  isFetching?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterPlaceholder = "",
  filterColumn,
  initialColumnVisibility,
  getRowId,
  onRowClick,
  getRowClassName,
  toolbar,
  manualPagination = false,
  pageCount,
  pageIndex,
  totalCount,
  onPageChange,
  manualSorting = false,
  sorting: sortingProp,
  onSortingChange: onSortingChangeProp,
  search,
  onSearchChange,
  isFetching = false,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  // El orden puede ser controlado (servidor) o interno (cliente).
  const sorting = sortingProp ?? internalSorting;
  const onSortingChange = onSortingChangeProp ?? setInternalSorting;
  const isManualSearch = typeof onSearchChange === "function";

  const fuzzyFilter: FilterFn<TData> = React.useCallback(
    (row, columnId, filterValue) => {
      const cellValue = row.getValue(columnId);
      if (cellValue == null) return false;
      return normalizeSearch(String(cellValue)).includes(normalizeSearch(String(filterValue)));
    },
    []
  );

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting,
    onSortingChange,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: fuzzyFilter,
    filterFns: { fuzzy: fuzzyFilter },
    ...(manualPagination
      ? { manualPagination: true, pageCount }
      : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: {
      columnVisibility: initialColumnVisibility ?? {},
    },
    state: {
      sorting,
      columnFilters,
      ...(manualPagination
        ? { pagination: { pageIndex: pageIndex ?? 0, pageSize: 10 } }
        : {}),
    },
  });

  const filterKey =
    filterColumn ??
    (columns.find((c) => "accessorKey" in c && typeof (c as { accessorKey?: string }).accessorKey === "string") as
      | { accessorKey?: string }
      | undefined)?.accessorKey;

  const showSearch = isManualSearch || !!filterKey;

  return (
    <div className="w-full min-w-0 space-y-4">
      {(showSearch || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 py-2">
          {isManualSearch ? (
            <Input
              type="search"
              placeholder={filterPlaceholder || "Buscar…"}
              aria-label={filterPlaceholder || "Buscar"}
              value={search ?? ""}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full sm:max-w-sm"
            />
          ) : filterKey ? (
            <Input
              type="search"
              placeholder={filterPlaceholder || "Buscar…"}
              aria-label={filterPlaceholder || "Buscar"}
              value={(table.getColumn(filterKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(filterKey)?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
          ) : null}
          {toolbar}
        </div>
      )}
      <div
        aria-busy={isFetching}
        className={cn(
          "w-full max-w-full overflow-x-auto rounded-md border transition-opacity",
          isFetching && "pointer-events-none opacity-60"
        )}
      >
        <Table className="w-full min-w-max">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={`${onRowClick ? "cursor-pointer hover:bg-hover hover:text-hover-foreground" : ""} ${getRowClassName?.(row.original) ?? ""}`.trim()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {manualPagination
        ? (pageCount ?? 1) > 1 && (
            <div className="flex flex-wrap items-center justify-end gap-2 py-2">
              <p className="text-muted-foreground w-full text-center text-xs font-medium uppercase tracking-wide sm:w-auto sm:mr-auto sm:text-left">
                Página {(pageIndex ?? 0) + 1} de {pageCount}
                {typeof totalCount === "number" ? ` · ${totalCount} resultados` : ""}
              </p>
              <div className="flex w-full justify-center gap-2 sm:w-auto sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.((pageIndex ?? 0) - 1)}
                  disabled={(pageIndex ?? 0) <= 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.((pageIndex ?? 0) + 1)}
                  disabled={(pageIndex ?? 0) >= (pageCount ?? 1) - 1}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )
        : table.getPageCount() > 1 && (
            <div className="flex flex-wrap items-center justify-end gap-2 py-2">
              <p className="text-muted-foreground w-full text-center text-xs font-medium uppercase tracking-wide sm:w-auto sm:text-left">
                Página {table.getState().pagination.pageIndex + 1} de{" "}
                {table.getPageCount()}
              </p>
              <div className="flex w-full justify-center gap-2 sm:w-auto sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
    </div>
  );
}
