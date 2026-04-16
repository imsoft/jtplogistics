"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ColumnDef } from "@tanstack/react-table";
import type { EmailAccount } from "@/types/resources.types";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  administrative: "Administrativo",
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
      accessorFn: (row) => `${row.email} ${row.type} ${row.assignees.map((a) => a.name).join(" ")}`,
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

export default function CollaboratorEmailsPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/collaborator/emails")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar correos");
        return r.json();
      })
      .then((data: EmailAccount[]) => {
        setEmails(data);
        setIsLoaded(true);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsLoaded(true);
      });
  }, []);

  const availableTypes = useMemo(
    () => [...new Set(emails.map((e) => e.type))].sort(),
    [emails]
  );

  const filtered = useMemo(
    () => emails.filter((e) => filterType === "all" || e.type === filterType),
    [emails, filterType]
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-heading">Correos</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Cuentas de correo registradas y sus accesos.
          </p>
        </div>
        <Button asChild className="w-full shrink-0 sm:w-fit" size="sm">
          <Link href="/collaborator/dashboard/emails/new">
            <Plus className="size-4" />
            Nueva cuenta
          </Link>
        </Button>
      </div>
      {!isLoaded ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : emails.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No hay correos registrados.
        </p>
      ) : (
        <DataTable<EmailAccount, unknown>
          columns={getColumns()}
          data={filtered}
          filterColumn="search"
          initialColumnVisibility={{ search: false }}
          getRowId={(row) => row.id}
          onRowClick={(email) => router.push(`/collaborator/dashboard/emails/${email.id}`)}
          toolbar={
            <>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {availableTypes.map((t) => (
                    <SelectItem key={t} value={t}>{emailTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilterType("all")}
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
