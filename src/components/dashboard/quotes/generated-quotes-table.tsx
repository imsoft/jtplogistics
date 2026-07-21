"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { type ColumnDef } from "@tanstack/react-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";

interface GeneratedQuote {
  id: string;
  quoteNumber: string;
  company: string;
  contact: string;
  phone: string | null;
  validUntil: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

function getColumns(): ColumnDef<GeneratedQuote>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.quoteNumber} ${row.company} ${row.contact} ${row.phone ?? ""}`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "quoteNumber",
      header: ({ column }) => <SortableColumnHeader column={column} title="Número" />,
      cell: ({ row }) => (
        <Link
          href={`/collaborator/dashboard/quotes/${row.original.id}/edit`}
          className="font-medium text-primary hover:underline"
        >
          {row.getValue("quoteNumber")}
        </Link>
      ),
    },
    {
      accessorKey: "company",
      header: ({ column }) => <SortableColumnHeader column={column} title="Empresa" />,
      cell: ({ row }) => <span>{row.getValue("company")}</span>,
    },
    {
      accessorKey: "contact",
      header: ({ column }) => <SortableColumnHeader column={column} title="Contacto" />,
      cell: ({ row }) => <span>{row.getValue("contact")}</span>,
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => <span>{row.getValue("phone") ?? "—"}</span>,
    },
    {
      accessorKey: "validUntil",
      header: ({ column }) => <SortableColumnHeader column={column} title="Válida hasta" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.getValue("validUntil") as string).toLocaleDateString("es-MX")}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumnHeader column={column} title="Creada" />,
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.getValue("createdAt") as string).toLocaleDateString("es-MX")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link
          href={`/collaborator/dashboard/quotes/${row.original.id}/edit`}
          className="inline-flex items-center justify-center"
        >
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      ),
    },
  ];
}

export function GeneratedQuotesTable() {
  const [quotes, setQuotes] = useState<GeneratedQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/collaborator/generated-quotes");
      if (res.ok) {
        const data = await res.json();
        setQuotes(data);
      }
    } catch (e) {
      console.error("Error al cargar cotizaciones:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (quotes.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No has creado cotizaciones aún.{" "}
        <Link href="/collaborator/dashboard/quotes/new" className="font-medium text-primary underline underline-offset-2">
          Crear una cotización
        </Link>
      </p>
    );
  }

  return <DataTable columns={getColumns()} data={quotes} />;
}
