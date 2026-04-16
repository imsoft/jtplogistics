"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import type { Employee } from "@/types/resources.types";

// ── Excel export ──────────────────────────────────────────────────────────────

const ALL_COLUMNS: { key: keyof Employee | "age" | "tenure"; label: string }[] = [
  { key: "name",      label: "Nombre" },
  { key: "email",     label: "Correo" },
  { key: "phone",     label: "Teléfono" },
  { key: "birthDate", label: "Fecha de nacimiento" },
  { key: "age",       label: "Edad" },
  { key: "hireDate",  label: "Fecha de ingreso" },
  { key: "tenure",    label: "Antigüedad" },
  { key: "position",  label: "Puesto" },
  { key: "department",label: "Departamento" },
];

function formatDateMx(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

function calcAge(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const now = new Date();
  let y = now.getFullYear() - d.getUTCFullYear();
  let m = now.getMonth() - d.getUTCMonth();
  if (m < 0) { y--; m += 12; }
  return y > 0 ? `${y} año${y !== 1 ? "s" : ""}, ${m} mes${m !== 1 ? "es" : ""}` : `${m} mes${m !== 1 ? "es" : ""}`;
}

async function exportToExcel(employees: Employee[], selectedKeys: Set<string>) {
  const { utils, writeFile } = await import("xlsx");

  const headers = ALL_COLUMNS
    .filter((c) => selectedKeys.has(c.key))
    .map((c) => c.label);

  const rows = employees.map((emp) =>
    ALL_COLUMNS
      .filter((c) => selectedKeys.has(c.key))
      .map((c) => {
        if (c.key === "age")    return emp.birthDate ? calcAge(emp.birthDate) : "";
        if (c.key === "tenure") return emp.hireDate  ? calcAge(emp.hireDate)  : "";
        if (c.key === "birthDate" || c.key === "hireDate") return formatDateMx(emp[c.key] as string | null);
        return (emp[c.key as keyof Employee] as string | null) ?? "";
      })
  );

  const ws = utils.aoa_to_sheet([headers, ...rows]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Colaboradores");

  // Auto column width
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2,
  }));
  ws["!cols"] = colWidths;

  writeFile(wb, "colaboradores.xlsx");
}

// ── Table columns ─────────────────────────────────────────────────────────────

function getColumns(): ColumnDef<Employee>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.email} ${row.position ?? ""} ${row.department ?? ""}`,
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
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
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

export function EmployeesTable() {
  const router = useRouter();
  const { data: employees, isLoaded, error } = useAdminFetch<Employee>(
    "/api/admin/employees",
    "Error al cargar colaboradores"
  );
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map((c) => c.key))
  );
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

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportToExcel(filtered, selectedKeys);
      setDialogOpen(false);
    } finally {
      setIsExporting(false);
    }
  }

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
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
        onRowClick={(emp) => router.push(`/admin/dashboard/employees/${emp.id}`)}
        toolbar={
          <>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los depto.</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {filtered.length !== employees.length && (
                <span className="block mt-1 text-xs">
                  Se exportarán {filtered.length} colaborador{filtered.length !== 1 ? "es" : ""} (filtro activo).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between pb-1 border-b">
              <span className="text-xs text-muted-foreground">Seleccionar</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSelectedKeys(new Set(ALL_COLUMNS.map((c) => c.key)))}
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
            {ALL_COLUMNS.map((col) => (
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
