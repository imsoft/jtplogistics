"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import {
  MaritimeQuotesCrmTable,
  type CrmMaritimeQuote,
} from "@/components/dashboard/maritime-quotes/maritime-quotes-crm-table";

export default function CollaboratorMaritimeQuotesPage() {
  const { permissions } = useCollaboratorPermissions();
  const canCreate = Boolean(permissions?.canCreateMaritimeQuotes);
  const [quotes, setQuotes] = useState<CrmMaritimeQuote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/maritime-quotes")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar cotizaciones");
        return r.json();
      })
      .then((data: CrmMaritimeQuote[]) => setQuotes(data))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-heading">Cotización marítima</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Solicitudes de impuestos de importación y su estado.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/collaborator/dashboard/maritime-quotes/new">
              <Plus className="size-4" />
              Nueva cotización
            </Link>
          </Button>
        )}
      </div>
      <Separator />
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : quotes === null ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : quotes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no se han generado cotizaciones marítimas.
        </p>
      ) : (
        <MaritimeQuotesCrmTable
          initialQuotes={quotes}
          editBase="/collaborator/dashboard/maritime-quotes"
          canEditAccepted={Boolean(permissions?.canEditAcceptedQuotes)}
        />
      )}
    </div>
  );
}
