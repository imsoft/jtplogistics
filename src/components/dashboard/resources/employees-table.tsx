"use client";

import { useMemo, useState } from "react";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { AppSelect } from "@/components/ui/app-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EMPLOYEE_EXPORT_COLUMNS,
  downloadXlsxFromAoa,
  employeesToExcelAoa,
  excelExportFilename,
} from "@/lib/excel-export";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import { formatPhone } from "@/lib/utils";
import type { Employee } from "@/types/resources.types";

// ── Table columns ─────────────────────────────────────────────────────────────

function getColumns(): ColumnDef<Employee>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.name} ${row.email} ${row.phone ?? ""} ${row.position ?? ""} ${row.department ?? ""}`,
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
      cell: ({ row }) => <span className="text-muted-foreground text-email">{row.getValue("email")}</span>,
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <SortableColumnHeader column={column} title="Teléfono" />,
      cell: ({ row }) => {
        const v = row.getValue("phone") as string | null;
        return v ? (
          <span className="whitespace-nowrap">{formatPhone(v)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "position",
      header: ({ column }) => <SortableColumnHeader column={column} title="Puesto" />,
      cell: ({ row }) => row.getValue("position") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "department",
      header: ({ column }) => <SortableColumnHeader column={column} title="Departamento" />,
      cell: ({ row }) => row.getValue("department") ?? <span className="text-muted-foreground">—</span>,
    },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EmployeesTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
}

export function EmployeesTable({
  apiEndpoint = "/api/admin/employees",
  detailBasePath = "/admin/dashboard/employees",
}: EmployeesTableProps = {}) {
  const router = useRouter();
  const { data: employees, isLoaded, error } = useAdminFetch<Employee>(
    apiEndpoint,
    "Error al cargar colaboradores"
  );
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(EMPLOYEE_EXPORT_COLUMNS.map((c) => c.key))
  );
  // Lo que queda en pantalla tras la búsqueda y el orden. La búsqueda vive
  // dentro de la tabla, así que antes el Excel la ignoraba y bajaba a todos.
  const [visibleRows, setVisibleRows] = useState<Employee[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean) as string[])).sort(),
    [employees]
  );

  const filtered = useMemo(() => employees.filter((e) => {
    if (filterDepartment !== "all" && e.department !== filterDepartment) return false;
    return true;
  }), [employees, filterDepartment]);

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  const toExport = visibleRows ?? filtered;

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadXlsxFromAoa(
        excelExportFilename("colaboradores"),
        "Colaboradores",
        employeesToExcelAoa(toExport, selectedKeys)
      );
      setDialogOpen(false);
    } finally {
      setIsExporting(false);
    }
  }

  if (!isLoaded) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (employees.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay colaboradores registrados.
      </p>
    );
  }

  return (
    <>
      <DataTable<Employee, unknown>
        columns={getColumns()}
        data={filtered}
        filterColumn="search"
        initialColumnVisibility={{ search: false }}
        getRowId={(row) => row.id}
        onRowClick={(emp) => router.push(`${detailBasePath}/${emp.id}`)}
        onVisibleRowsChange={setVisibleRows}
        toolbar={
          <>
            <AppSelect
              value={filterDepartment}
              onValueChange={setFilterDepartment}
              options={[{value: "all", label: "Todos los depto."}, ...departments.map((d) => ({value: d, label: d}))]}
              className="w-full sm:w-40"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterDepartment("all")}
            >
              Limpiar filtros
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              <FileDown className="size-4" />
              Exportar Excel
            </Button>
          </>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exportar a Excel</DialogTitle>
            <DialogDescription>
              Selecciona las columnas que quieres incluir en el archivo.
              <span className="block mt-1 text-xs">
                {toExport.length === employees.length
                  ? `Se exportarán los ${employees.length} colaboradores.`
                  : `Se exportarán ${toExport.length} de ${employees.length} colaboradores: los que dejan ver la búsqueda y los filtros.`}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between pb-1 border-b">
              <span className="text-xs text-muted-foreground">Seleccionar</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSelectedKeys(new Set(EMPLOYEE_EXPORT_COLUMNS.map((c) => c.key)))}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setSelectedKeys(new Set())}
                >
                  Ninguna
                </button>
              </div>
            </div>
            {EMPLOYEE_EXPORT_COLUMNS.map((col) => (
              <div key={col.key} className="flex items-center gap-3">
                <Checkbox
                  id={`col-${col.key}`}
                  checked={selectedKeys.has(col.key)}
                  onCheckedChange={() => toggleKey(col.key)}
                />
                <Label htmlFor={`col-${col.key}`} className="cursor-pointer font-normal">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={selectedKeys.size === 0 || isExporting}
            >
              <FileDown className="size-4" />
              {isExporting ? "Generando…" : "Descargar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
