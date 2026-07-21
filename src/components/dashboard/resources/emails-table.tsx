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
import type { EmailAccount } from "@/types/resources.types";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  administrative: "Administrativo / Qweb360",
  gmail: "Gmail",
  icloud: "iCloud",
  hotmail: "Hotmail",
  outlook: "Outlook",
  hosting: "Hosting",
  yahoo: "Yahoo",
};

function emailTypeLabel(type: string) {
  return EMAIL_TYPE_LABELS[type.toLowerCase()] ?? type;
}

function getColumns(): ColumnDef<EmailAccount>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.email} ${row.type} ${row.department ?? ""} ${row.assignees.map((a) => a.name).join(" ")}`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("email")}</span>,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => emailTypeLabel(row.getValue("type")),
    },
    {
      accessorKey: "department",
      header: ({ column }) => <SortableColumnHeader column={column} title="Departamento" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("department");
        return v ? <span>{v}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "assignees",
      header: ({ column }) => <SortableColumnHeader column={column} title="Asignados" />,
      accessorFn: (row) => row.assignees.map((a) => a.name).join(", "),
      cell: ({ row }) => {
        const names = row.original.assignees.map((a) => a.name).join(", ");
        return names || <span className="text-muted-foreground">Sin asignar</span>;
      },
    },
  ];
}

interface EmailsTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
}

export function EmailsTable({
  apiEndpoint = "/api/admin/emails",
  detailBasePath = "/admin/dashboard/emails",
}: EmailsTableProps = {}) {
  const router = useRouter();
  const { data: emails, isLoaded, error } = useAdminFetch<EmailAccount>(
    apiEndpoint,
    "Error al cargar correos"
  );
  const [filterType, setFilterType] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");

  const assigned = useMemo(() => emails.filter((e) => e.assignees.length > 0), [emails]);
  const unassigned = useMemo(() => emails.filter((e) => e.assignees.length === 0), [emails]);

  const availableTypes = useMemo(
    () => [...new Set(emails.map((e) => e.type))].sort(),
    [emails]
  );

  const departments = useMemo(
    () => Array.from(new Set(assigned.map((e) => e.department).filter(Boolean) as string[])).sort(),
    [assigned]
  );

  const filteredAssigned = useMemo(
    () => assigned.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterDepartment !== "all" && e.department !== filterDepartment) return false;
      return true;
    }),
    [assigned, filterType, filterDepartment]
  );

  const filteredUnassigned = useMemo(
    () => unassigned.filter((e) => filterType === "all" || e.type === filterType),
    [unassigned, filterType]
  );

  const columns = useMemo(() => getColumns(), []);

  if (!isLoaded) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (emails.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay correos registrados.
      </p>
    );
  }

  const hasActiveFilters = filterType !== "all" || filterDepartment !== "all";

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Asignados</h2>
            <p className="text-xs text-muted-foreground">{filteredAssigned.length} correo{filteredAssigned.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppSelect
              value={filterDepartment}
              onValueChange={setFilterDepartment}
              options={[{value: "all", label: "Todos los depto."}, ...departments.map((d) => ({value: d, label: d}))]}
              className="w-full sm:w-[160px]"
            />
            <AppSelect
              value={filterType}
              onValueChange={setFilterType}
              options={[{value: "all", label: "Todos los tipos"}, ...availableTypes.map((t) => ({value: t, label: emailTypeLabel(t)}))]}
              className="w-full sm:w-[140px]"
            />
            {hasActiveFilters && (
              <Button type="button" variant="outline" onClick={() => { setFilterType("all"); setFilterDepartment("all"); }}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
        {filteredAssigned.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No hay correos asignados{hasActiveFilters ? " con esos filtros" : ""}.
          </p>
        ) : (
          <DataTable<EmailAccount, unknown>
            columns={columns}
            data={filteredAssigned}
            filterColumn="search"
            initialColumnVisibility={{ search: false }}
            getRowId={(row) => row.id}
            onRowClick={(email) => router.push(`${detailBasePath}/${email.id}`)}
          />
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Sin asignar</h2>
          <p className="text-xs text-muted-foreground">{filteredUnassigned.length} correo{filteredUnassigned.length !== 1 ? "s" : ""} disponible{filteredUnassigned.length !== 1 ? "s" : ""}</p>
        </div>
        {filteredUnassigned.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Todos los correos están asignados.
          </p>
        ) : (
          <DataTable<EmailAccount, unknown>
            columns={columns}
            data={filteredUnassigned}
            filterColumn="search"
            initialColumnVisibility={{ search: false }}
            getRowId={(row) => row.id}
            onRowClick={(email) => router.push(`${detailBasePath}/${email.id}`)}
          />
        )}
      </div>
    </div>
  );
}
