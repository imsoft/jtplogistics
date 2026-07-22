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
import type { PhoneDevice } from "@/types/resources.types";
import { formatPhone, formatIMEI } from "@/lib/utils";

function getColumns(): ColumnDef<PhoneDevice>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => `${row.name} ${row.phoneNumber ?? ""} ${row.imei ?? ""} ${row.color ?? ""} ${row.department ?? ""} ${row.assignedTo?.name ?? ""} ${row.emailAccount?.email ?? ""}`,
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
      accessorKey: "phoneNumber",
      header: ({ column }) => <SortableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("phoneNumber");
        return v ? formatPhone(v) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "imei",
      header: ({ column }) => <SortableColumnHeader column={column} title="IMEI" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("imei");
        return v ? formatIMEI(v) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "color",
      header: ({ column }) => <SortableColumnHeader column={column} title="Color" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("color");
        return v ? <span>{v}</span> : <span className="text-muted-foreground">—</span>;
      },
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
      id: "assignedTo",
      header: ({ column }) => <SortableColumnHeader column={column} title="Asignado a" />,
      accessorFn: (row) => row.assignedTo?.name ?? "",
      cell: ({ row }) => {
        const name = row.original.assignedTo?.name;
        return name ? <span>{name}</span> : <span className="text-muted-foreground">Sin asignar</span>;
      },
    },
    {
      id: "emailAccount",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo" />,
      accessorFn: (row) => row.emailAccount?.email ?? "",
      cell: ({ row }) => {
        const email = row.original.emailAccount?.email;
        return email ? <span className="text-xs normal-case">{email}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
  ];
}

interface PhonesTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
}

export function PhonesTable({
  apiEndpoint = "/api/admin/phones",
  detailBasePath = "/admin/dashboard/phones",
}: PhonesTableProps = {}) {
  const router = useRouter();
  const { data: phones, isLoaded, error } = useAdminFetch<PhoneDevice>(
    apiEndpoint,
    "Error al cargar celulares"
  );
  const [filterDepartment, setFilterDepartment] = useState("all");

  const assigned = useMemo(() => phones.filter((p) => p.assignedToId), [phones]);
  const unassigned = useMemo(() => phones.filter((p) => !p.assignedToId), [phones]);

  const departments = useMemo(
    () => Array.from(new Set(assigned.map((p) => p.department).filter(Boolean) as string[])).sort(),
    [assigned]
  );

  const filteredAssigned = useMemo(
    () => assigned.filter((p) => filterDepartment === "all" || p.department === filterDepartment),
    [assigned, filterDepartment]
  );

  const columns = useMemo(() => getColumns(), []);

  if (!isLoaded) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (phones.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay celulares registrados.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Asignados</h2>
            <p className="text-xs text-muted-foreground">{filteredAssigned.length} celular{filteredAssigned.length !== 1 ? "es" : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppSelect
              value={filterDepartment}
              onValueChange={setFilterDepartment}
              options={[{value: "all", label: "Todos los depto."}, ...departments.map((d) => ({value: d, label: d}))]}
              className="w-full sm:w-[160px]"
            />
            {filterDepartment !== "all" && (
              <Button type="button" variant="outline" onClick={() => setFilterDepartment("all")}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
        {filteredAssigned.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No hay celulares asignados{filterDepartment !== "all" ? " en ese departamento" : ""}.
          </p>
        ) : (
          <DataTable<PhoneDevice, unknown>
            columns={columns}
            data={filteredAssigned}
            filterColumn="search"
            initialColumnVisibility={{ search: false }}
            getRowId={(row) => row.id}
            onRowClick={(phone) => router.push(`${detailBasePath}/${phone.id}`)}
          />
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Sin asignar</h2>
          <p className="text-xs text-muted-foreground">{unassigned.length} celular{unassigned.length !== 1 ? "es" : ""} disponible{unassigned.length !== 1 ? "s" : ""}</p>
        </div>
        {unassigned.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Todos los celulares están asignados.
          </p>
        ) : (
          <DataTable<PhoneDevice, unknown>
            columns={columns}
            data={unassigned}
            filterColumn="search"
            initialColumnVisibility={{ search: false }}
            getRowId={(row) => row.id}
            onRowClick={(phone) => router.push(`${detailBasePath}/${phone.id}`)}
          />
        )}
      </div>
    </div>
  );
}
