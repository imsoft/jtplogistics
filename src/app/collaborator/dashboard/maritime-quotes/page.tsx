"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import {
  MaritimeQuotesCrmTable,
  type CrmMaritimeQuote,
} from "@/components/dashboard/maritime-quotes/maritime-quotes-crm-table";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";

export default function CollaboratorMaritimeQuotesPage() {
  const router = useRouter();
  const { permissions, isLoaded } = useCollaboratorPermissions();
  const [quotes, setQuotes] = useState<CrmMaritimeQuote[] | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoaded && !permissions?.canViewMaritimeQuotes && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/collaborator/dashboard/profile");
    }
  }, [isLoaded, permissions, router]);

  useEffect(() => {
    if (!permissions?.canViewMaritimeQuotes) return;
    fetch("/api/maritime-quotes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CrmMaritimeQuote[]) => setQuotes(Array.isArray(data) ? data : []))
      .catch(() => setQuotes([]));
  }, [permissions]);

  if (!isLoaded || !permissions?.canViewMaritimeQuotes) return null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">Cotización marítima</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
            Solicitudes de impuestos de importación y su estado.
          </p>
        </div>
        {permissions.canCreateMaritimeQuotes && (
          <Button asChild>
            <Link href="/collaborator/dashboard/maritime-quotes/new">
              <Plus className="size-4" />
              Nueva cotización
            </Link>
          </Button>
        )}
      </div>

      {quotes === null ? (
        <DataTableSkeleton />
      ) : quotes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aún no se han generado cotizaciones marítimas.
        </p>
      ) : (
        <MaritimeQuotesCrmTable
          initialQuotes={quotes}
          editBase="/collaborator/dashboard/maritime-quotes"
          canEditAccepted={permissions.canEditAcceptedQuotes}
          canUpdate={permissions.canUpdateMaritimeQuotes}
          canDelete={permissions.canDeleteMaritimeQuotes}
        />
      )}
    </div>
  );
}
