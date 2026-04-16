"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRound, Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import type { Employee } from "@/types/resources.types";

function getColumns(): ColumnDef<Employee>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.name} ${row.email} ${row.position ?? ""} ${row.department ?? ""}`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Correo" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "position",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Puesto" />
      ),
      cell: ({ row }) =>
        row.getValue("position") ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "department",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Departamento" />
      ),
      cell: ({ row }) =>
        row.getValue("department") ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];
}

export default function CollaboratorEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState("all");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/employees")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar colaboradores");
        return r.json();
      })
      .then((data: Employee[]) => {
        setEmployees(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(employees.map((e) => e.department).filter(Boolean) as string[])
      ).sort(),
    [employees]
  );

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        if (filterDepartment !== "all" && e.department !== filterDepartment)
          return false;
        return true;
      }),
    [employees, filterDepartment]
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-muted-foreground" />
            <h1 className="page-heading">Colaboradores</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Colaboradores registrados en el sistema.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/collaborator/dashboard/employees/new">
            <Plus className="size-4" />
            Nuevo colaborador
          </Link>
        </Button>
      </div>

      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : employees.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay colaboradores registrados.
        </p>
      ) : (
        <DataTable<Employee, unknown>
          columns={getColumns()}
          data={filtered}
          filterColumn="search"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
          onRowClick={(emp) =>
            router.push(`/collaborator/dashboard/employees/${emp.id}`)
          }
          toolbar={
            <>
              <Select
                value={filterDepartment}
                onValueChange={setFilterDepartment}
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los depto.</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
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
            </>
          }
        />
      )}
    </div>
  );
}
